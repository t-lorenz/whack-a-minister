import { Counterpart, CounterpartTypes, HitEvent } from './counterpart.class';
import { Component, OnInit, ViewChild } from '@angular/core';
import { Sprite, Application, Sound, Text, Point, Container, Graphics, TextStyle } from 'pixi.js';
import { BrowserModule } from '@angular/platform-browser';

//import * as PIXI from "pixi.js/dist/pixi.js"
declare var PIXI: any; // instead of importing pixi like some tutorials say to do use declare

enum GameStates {
  IdleState = 'Idle',
  CounterpartVisibleState = 'Visible',
  CounterpartHiddenState = 'Hidden',
  CounterpartHittingState = 'Hitting',
  CounterpartRepositioningState = 'Repositioning',
  GameOverState = 'Game Over'
};


@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})

export class AppComponent implements OnInit {


  // List of files to load
  private manifest = {
    carImage: 'assets/images/car.png',
    wheelImage: 'assets/images/wheel.png',
    enemyImage: 'assets/images/scheuer.png',
    enemyImageWhacked: 'assets/images/scheuer-whacked.png',
    friendImage: 'assets/images/greta.png',
    friendImageWhacked: 'assets/images/greta-whacked.png',
    punchCorona: 'assets/images/punch-corona.png',
    backgroundImage0: 'assets/images/back0.png',
    backgroundImage1: 'assets/images/back1.png',
    backgroundImage2: 'assets/images/back2.png',
    backgroundImage3: 'assets/images/back3.png',
    backgroundImage4: 'assets/images/back4.png',
    fuelgauge: 'assets/images/fuelgauge.png',
    needle: 'assets/images/needle.png',
    handImage: 'assets/images/hand.png',
    handSmackingImage: 'assets/images/hand-smacking.png',
    clapSound: 'assets/sounds/clap.mp3',
    punchSound: 'assets/sounds/punch.mp3',
    backingTrack: 'assets/sounds/scheuertrack1.mp3',
    failureSound: 'assets/sounds/failure.mp3'
  };

  title = 'Scheuer-Den-Scheuer';

  @ViewChild('pixiContainer') pixiContainer; // this allows us to reference and load stuff into the div container
  public app: Application; // this will be our pixi application
  public gameState: GameStates;

  private referenceWidth: number;
  private relStreetHeight: number;

  private chanceForEnemy: number;
  private counterpartType: CounterpartTypes;
  public counterparts: Counterpart[];
  private counterpartHiddenTime: number;

  private stillAllowedFailuresCount: number;
  private maxAllowedFailuresCount: number;
  private allowedFailureSlotSprites: Sprite[];
  private needleSprite: Sprite;

  private score: number;
  private scoreRoll: number;
  private speed: number;
  private availableTime: number;
  private timeLeft: number;

  private landscape: Container;
  private landscapeZoom: number;
  private carSprite: Sprite;
  private frontWheelSprite: Sprite;
  private rearWheelSprite: Sprite;
  private counterpartSprite: Sprite;
  private cursorSprite: Sprite;
  private backgroundSprites: PIXI.extras.TilingSprite[];
  private stateText: Text;
  private stateTime: number;

  private scoreText: Text;
  private textStyle: TextStyle;
  private holeRelPositions: Point[] = [
    //new Point(0.16, 0.43),//1-Kofferraum
    new Point(0.16, 1),//2-ganzhinten
    new Point(0.31, 1),//3-fasthinten
    new Point(0.45, 1),//4-zweitevonvorne
    //new Point(0.54, 0.32),//5-dachluke
    new Point(0.61, 1),//6-vorne
    //new Point(0.85, 0.50),//7-motorhaube 
  ];

  private counterpartHiddenDuration: number;
  private counterpartVisibleDuration: number;

  ngOnInit() {

    // reference width is taken from iPad Pro Retina
    this.referenceWidth = 2732;
    this.landscapeZoom = 1.0;
    this.relStreetHeight = 0.05;
    this.availableTime = 60;

    this.maxAllowedFailuresCount = 3;
    this.allowedFailureSlotSprites = [];
    this.backgroundSprites = [];
    this.counterparts = [];

    const parent = this.pixiContainer.nativeElement;
    this.app = new PIXI.Application({
      width: parent.clientWidth,
      height: parent.clientHeight,
      backgroundColor: 0xbcd6f8
    }); // this creates our pixi application

    this.pixiContainer.nativeElement.appendChild(this.app.view); // this places our pixi application onto the viewable document

    if (!PIXI.utils.isWebGLSupported()) {
    }

    this.loadFonts();

    // Add to the PIXI loader
    for (let name in this.manifest) {
      PIXI.loader.add(name, this.manifest[name]);
    }

    PIXI.loader.
      on("progress", this.onLoad).
      load(this.setup.bind(this));
  }

  onLoad(loader, resource) {
    console.log(`loaded ${resource.url}. Loading is ${loader.progress}% complete.`);
  }

  loadFonts() {
    // window.we.WebFontConfig = {
    //   google: {
    //     families: ['Snippet', 'Arvo:700italic', 'Podkova:700']
    //   },

    //   active: function () {
    //     // do something
    //     init();
    //   }
    // };

    // include the web-font loader script
    /* jshint ignore:start */
    (function () {
      var wf = document.createElement('script');
      wf.src = ('https:' === document.location.protocol ? 'https' : 'http') +
        '://ajax.googleapis.com/ajax/libs/webfont/1/webfont.js';
      wf.type = 'text/javascript';
      wf.async = true;
      var s = document.getElementsByTagName('script')[0];
      s.parentNode.insertBefore(wf, s);
    })();
    /* jshint ignore:end */

    this.textStyle = new PIXI.TextStyle({
      fontFamily: 'Arial',
      fontSize: 36,
      fontStyle: 'italic',
      fontWeight: 'bold',
      fill: ['#ffffff', '#00ff99'], // gradient
      stroke: '#4a1850',
      strokeThickness: 5,
      dropShadow: true,
      dropShadowColor: '#000000',
      dropShadowBlur: 4,
      dropShadowAngle: Math.PI / 6,
      dropShadowDistance: 6,
      wordWrap: true,
      wordWrapWidth: 440
    });
  }

  setupGameVariables() {
    this.initGameVariables();
    this.updateTurnVariables();
    this.goToState(GameStates.CounterpartHiddenState);
  }

  setupText() {
    this.stateText = new PIXI.Text(this.gameState);
    this.app.stage.addChild(this.stateText);
  }

  setupScore() {
    this.scoreText = new PIXI.Text('', this.textStyle);
    this.app.stage.addChild(this.scoreText);
  }

  setupCounterparts() {
    for (let i = 0; i < this.holeRelPositions.length; i++) {
      let relPosition = this.holeRelPositions[i];
      let position = new Point(
        relPosition.x * this.app.screen.width,
        this.app.screen.height - relPosition.y * this.carSprite.height
        - this.relStreetHeight * this.app.screen.height // street offset
      );
      let scaleFactor = (this.app.renderer.view.width / this.referenceWidth);

      let c = new Counterpart(
        this.app.ticker,
        position.x,
        position.y,
        scaleFactor,
        this.textStyle
      );
     
      c.wasHit.subscribe((event: HitEvent) => this.onWasHit(event))
      this.counterparts.push(c);
      this.landscape.addChild(c.container);
    }
  }

  onWasHit(event: HitEvent) {
    let sender = event.sender;
    let success = event.success;
    let scoreDelta = 0;
    if (success) {
      scoreDelta = 10 + this.scoreRoll;
      this.scoreRoll += 2;
    } else {
      scoreDelta = -30;
      this.scoreRoll = 0;
    }
    this.increaseScore(scoreDelta);
    sender.setScore(scoreDelta);
  }

  setupBackground() {
    let tileSize = 2048;
    for (let i = 0; i < 5; i++) {
      let scaleFactor = (this.app.renderer.view.width / tileSize);
      this.backgroundSprites.push(new PIXI.extras.TilingSprite(
        PIXI.loader.resources['backgroundImage' + i.toString()].texture,
        tileSize,
        tileSize
      ));
      this.backgroundSprites[i].position.y = (this.app.renderer.height - tileSize * scaleFactor);
      this.backgroundSprites[i].scale.x *= scaleFactor;
      this.backgroundSprites[i].scale.y *= scaleFactor;
      this.landscape.addChild(this.backgroundSprites[i]);
    }
  }


  setupTimerDisplay() {
    let container = new PIXI.DisplayObjectContainer();

    let gaugeSprite = new PIXI.Sprite(
      PIXI.loader.resources['fuelgauge'].texture
    );
    container.addChild(gaugeSprite);

    this.needleSprite = new PIXI.Sprite(
      PIXI.loader.resources['needle'].texture
    );

    this.needleSprite.x = gaugeSprite.width / 2;
    this.needleSprite.y = this.needleSprite.height * 0.7;
    this.needleSprite.anchor.x = 0.5;
    this.needleSprite.anchor.y = 0.5;
    container.addChild(this.needleSprite);

    let scaleFactor = (this.app.renderer.view.height / this.referenceWidth) * 2;

    container.scale.x *= scaleFactor;
    container.scale.y *= scaleFactor;
    container.x = (this.app.renderer.view.width - container.width) / 2;

    this.app.stage.addChild(container);
  }

  setupFailuresDisplay() {
    for (let i = 0; i < this.maxAllowedFailuresCount; i++) {
      let slotSprite = new PIXI.Sprite(
        PIXI.loader.resources['friendImage'].texture
      );
      this.allowedFailureSlotSprites.push(slotSprite);
      slotSprite.scale.x *= 0.2;
      slotSprite.scale.y *= 0.2;
      slotSprite.position.x = 10 + i * slotSprite.width;
      slotSprite.position.y = 10;
      this.app.stage.addChild(slotSprite);
    }
  }

  setupCursor() {
    this.app.renderer.plugins.interaction.cursorStyles.default = 'none';

    let interaction = this.app.renderer.plugins.interaction;

    this.cursorSprite = new PIXI.Sprite(
      PIXI.loader.resources['handImage'].texture
    );



    this.cursorSprite.anchor.set(0.35, 0.25); // position specific to where the actual cursor point is

    let scaleFactor = (this.app.renderer.view.width / this.referenceWidth);
    this.cursorSprite.scale.x *= scaleFactor;
    this.cursorSprite.scale.y *= scaleFactor;
    this.cursorSprite.visible = false;

    this.app.stage.addChild(this.cursorSprite);

    // interaction.on("pointerover", () => {
    //   this.cursorSprite.visible = true;
    // });
    // interaction.on("pointerout", () => {
    //   this.cursorSprite.visible = false;
    // });
    // interaction.on("pointermove", (event) => {
    //   this.cursorSprite.position = event.data.global;
    // });
  }

  setupLandscape() {
    this.landscape = new PIXI.DisplayObjectContainer();
    this.landscape.pivot.x = 0.5;
    this.landscape.pivot.y = 0.5;
    //(PIXI.DisplayObjectContainer)(this.landscape).anchor.x = 0.5;
    //(PIXI.DisplayObjectContainer)(this.landscape).anchor.y = 0.5;
    this.app.stage.addChild(this.landscape);
  }

  setupCar() {
    this.carSprite = new PIXI.Sprite(
      PIXI.loader.resources['carImage'].texture
    );
    this.carSprite.anchor.x = 0.5;
    this.carSprite.anchor.y = 0.5;

    let scaleFactor = (this.app.renderer.view.width / this.referenceWidth);
    this.carSprite.scale.x *= scaleFactor;
    this.carSprite.scale.y *= scaleFactor;

    this.carSprite.position.set(
      this.app.renderer.view.width * 0.5065,
      this.app.renderer.view.height - this.carSprite.height * 0.8
      - this.relStreetHeight * this.app.screen.height // street offset
      // - Math.min(
      //   this.app.renderer.view.height * 0.15, // relative to screen height the car will become higher
      //   this.carSprite.height * 0.4 // but not higher than one forth of the car's height
      // )
    );
    this.landscape.addChild(this.carSprite);

    // this.app.ticker.add(function (delta) {
    //   // just for fun, let's rotate mr rabbit a little
    //   // delta is 1 if running at 100% performance
    //   // creates frame-independent transformation
    //   this.carSprite.rotation += 0.1 * delta;
    // });

    this.setupWheels();
  }

  setupWheels() {

    let scaleFactor = (this.app.renderer.view.width / this.referenceWidth);

    this.frontWheelSprite = new PIXI.Sprite(
      PIXI.loader.resources['wheelImage'].texture
    );
    this.frontWheelSprite.anchor.set(0.5);

    this.frontWheelSprite.scale.x *= scaleFactor;
    this.frontWheelSprite.scale.y *= scaleFactor;

    this.frontWheelSprite.position.set(
      this.app.renderer.view.width * 0.82,
      this.app.screen.height - this.frontWheelSprite.height / 2
      - this.relStreetHeight * this.app.screen.height // street offset
    );
    this.landscape.addChild(this.frontWheelSprite);

    this.rearWheelSprite = new PIXI.Sprite(
      PIXI.loader.resources['wheelImage'].texture
    );
    this.rearWheelSprite.anchor.set(0.5);
    this.rearWheelSprite.scale.x *= scaleFactor;
    this.rearWheelSprite.scale.y *= scaleFactor;

    this.rearWheelSprite.position.set(
      this.app.renderer.view.width * 0.249,
      this.app.screen.height - this.rearWheelSprite.height / 2
      - this.relStreetHeight * this.app.screen.height // street offset
    );

    this.landscape.addChild(this.rearWheelSprite);
  }

  createCounterpartSprite(): Sprite {
    let sprite = new PIXI.Sprite(
      this.getTextureFromCounterpartType(false)
    );

    sprite.anchor.set(0.5);

    let scaleFactor = (this.app.renderer.view.width / this.referenceWidth);
    sprite.scale.x *= scaleFactor;
    sprite.scale.y *= scaleFactor;

    sprite.interactive = true;
    sprite.on("pointerdown", this.onPointerDown.bind(this));

    this.landscape.addChild(sprite);

    return sprite;
  }

  setupCounterpart() {
    this.counterpartSprite = new PIXI.Sprite(
      this.getTextureFromCounterpartType(false)
    );

    this.counterpartSprite.anchor.set(0.5);

    let scaleFactor = (this.app.renderer.view.width / this.referenceWidth);
    this.counterpartSprite.scale.x *= scaleFactor;
    this.counterpartSprite.scale.y *= scaleFactor;

    this.counterpartSprite.interactive = true;
    this.counterpartSprite.on("pointerdown", this.onPointerDown.bind(this));
    this.counterpartSprite.visible = false;
    this.landscape.addChild(this.counterpartSprite);
    this.changeCounterpart();
  }

  setup() {

    this.setupLandscape();
    this.setupBackground();
    this.setupCar();
    this.setupCounterparts();
    this.setupCounterpart();
    this.setupCursor();
    this.setupText();
    this.setupScore();
    //this.setupFailuresDisplay();
    this.setupTimerDisplay();
    this.setupGameVariables();

    let backingTrack: Sound = PIXI.loader.resources['backingTrack'].data;
    //backingTrack.play();

    this.app.ticker.add(this.update.bind(this));
  }

  onPointerDown() {
    if (this.gameState != GameStates.CounterpartVisibleState) {
      return;
    }

    let hitSound: Sound;
    if (this.counterpartType == CounterpartTypes.EnemyCounterpart) {
      hitSound = PIXI.loader.resources['punchSound'].data;
      this.increaseScore(1000);
    } else {
      hitSound = PIXI.loader.resources['failureSound'].data;
      this.increaseScore(-2000);

      this.stillAllowedFailuresCount--;
      this.allowedFailureSlotSprites[this.stillAllowedFailuresCount].alpha = 0.5;
    }

    hitSound.play();


    if (this.stillAllowedFailuresCount > 0) {
      this.cursorSprite.texture = PIXI.loader.resources['handSmackingImage'].texture;

      this.counterpartSprite.texture = this.getTextureFromCounterpartType(true);
      this.counterpartSprite.scale.x -= 0.1;
      this.counterpartSprite.scale.y -= 0.1;
      this.goToState(GameStates.CounterpartHittingState);
    } else {
      this.landscape.alpha = 0.5;
      this.goToState(GameStates.GameOverState);
    }
  }

  update(delta: number) {

    this.stateTime += delta;
    this.counterpartHiddenTime += delta;

    if (this.counterpartHiddenTime > this.counterpartHiddenDuration) {
      let counterpart = this.counterparts[Math.floor(this.counterparts.length * Math.random())];
      counterpart.show(this.calculateCounterpartTypeRandomly(), this.counterpartVisibleDuration);
      this.updateTurnVariables();
    }

    switch (this.gameState) {
      // case GameStates.CounterpartHiddenState: {
      //   if (this.landscape.scale.x > 1.0) {
      //     this.landscape.scale.x -= 0.05;
      //     this.landscape.scale.y -= 0.05;
      //   }

      //   if (this.stateTime > this.counterpartHiddenDuration) {
      //     this.speed += 0.2;
      //     this.counterpartSprite.visible = true;
      //     this.goToState(GameStates.CounterpartVisibleState);
      //   }
      // } break;
      // case GameStates.CounterpartVisibleState: {
      //   if (this.landscape.scale.x < this.landscapeZoom) {
      //     this.landscape.scale.x += 0.05;
      //     this.landscape.scale.y += 0.05;
      //   }

      //   if (this.stateTime > this.counterpartVisibleDuration) {
      //     // the player missed an enemy
      //     this.counterpartSprite.visible = false;

      //     if (this.counterpartType == CounterpartTypes.EnemyCounterpart) {
      //       this.increaseScore(-500);
      //       PIXI.loader.resources['failureSound'].data.play();
      //     }

      //     this.changeCounterpart();
      //     this.goToState(GameStates.CounterpartHiddenState);
      //   }
      // } break;
      case GameStates.CounterpartHittingState: {
        if (this.stateTime > 5) {
          let clapSound: Sound = PIXI.loader.resources['clapSound'].data;
          clapSound.play();
        }
        if (this.stateTime > 30) {
          this.cursorSprite.texture = PIXI.loader.resources['handImage'].texture;

          this.counterpartSprite.scale.x += 0.1;
          this.counterpartSprite.scale.y += 0.1;
          this.counterpartSprite.visible = false;
          this.counterpartSprite.texture = this.getTextureFromCounterpartType(false);

          this.counterpartSprite.visible = false;
          this.changeCounterpart();
          this.goToState(GameStates.CounterpartHiddenState);
        }
      } break;
      case GameStates.GameOverState: {

        if (this.stateTime > 100) {
          this.landscape.alpha = 1.0
          this.changeCounterpart();
          this.initGameVariables();
          this.goToState(GameStates.CounterpartHiddenState)
        }
      } break;
    }
    //this.enemy.rotation += 0.1 * delta;

    if (this.gameState != GameStates.GameOverState) {
      this.updateRide(delta);
    }

    this.updateTimerProgress(delta);


    // if (this.score <= 0) {
    //   this.landscape.alpha = 0.5;
    //   this.goToState(GameStates.GameOverState);
    // }
  }

  updateRide(delta: number) {
    this.carSprite.rotation = Math.sin(this.stateTime / 2) / 320 * this.speed;
    this.frontWheelSprite.rotation += 0.05 * delta * this.speed;
    this.rearWheelSprite.rotation += 0.05 * delta * this.speed;

    for (let i = 0; i < 5; i++) {
      this.backgroundSprites[i].tilePosition.x -= 2 * this.speed * (i + 1);
    }
  }

  updateTimerProgress(delta: number) {
    this.timeLeft -= delta / 100;

    if (this.timeLeft <= 0) {
      this.landscape.alpha = 0.5;
      this.goToState(GameStates.GameOverState);
      return;
    }

    this.speed = (this.availableTime / this.timeLeft);

    for (let i = 0; i < this.counterparts.length; i++) {
      this.counterparts[i].setSpeed(this.speed);
    }
    this.stateText.text = this.speed.toString();

    this.needleSprite.rotation = Math.sin(10) + Math.sin(90) / this.speed + Math.random() / 30;


    //console.log(this.timeLeft);
    // let width = this.timerProgress.parent.width * 0.5;
    // this.timerProgress.beginFill(0xFF0000);
    // this.timerProgress.drawRoundedRect(
    //   0,
    //   0,
    //   width,
    //   this.timerProgress.height,
    //   this.timerProgress.height / 2);
    // this.timerProgress.endFill();
  }

  updateTurnVariables() {
    this.counterpartHiddenDuration = (Math.random() * 50 + 50) / this.speed;
    this.counterpartVisibleDuration = (Math.random() * 200 + 50) / this.speed;
    // this.counterpartSprite.texture = this.getTextureFromCounterpartType(false);
    this.counterpartHiddenTime = 0;
  }

  initGameVariables() {
    this.score = 0;
    this.scoreRoll = 0;
    this.speed = 1.0;
    this.timeLeft = this.availableTime;
    this.chanceForEnemy = 0.8;
    this.counterpartType = this.calculateCounterpartTypeRandomly();




    this.stillAllowedFailuresCount = this.maxAllowedFailuresCount;
    // for (let i = 0; i < this.maxAllowedFailuresCount; i++) {
    //   this.allowedFailureSlotSprites[i].alpha = 1.0;
    // }
  }

  increaseScore(inc: number) {
    this.score += inc;
    if (this.score < 0) {
      this.score = 0;
    }
    this.scoreText.text = this.score.toString();
    this.scoreText.position.x = this.app.screen.width - this.scoreText.width;
  }

  getTextureFromCounterpartType(isWhacked: boolean): any {
    let addon = '';
    if (isWhacked) {
      addon = 'Whacked';
    }
    if (this.counterpartType == CounterpartTypes.EnemyCounterpart) {
      return PIXI.loader.resources['enemyImage' + addon].texture
    } else if (this.counterpartType == CounterpartTypes.FriendCounterpart) {
      return PIXI.loader.resources['friendImage' + addon].texture
    }
  }

  calculateCounterpartTypeRandomly(): CounterpartTypes {
    if (Math.random() >= this.chanceForEnemy) {
      return CounterpartTypes.FriendCounterpart;
    } else {
      return CounterpartTypes.EnemyCounterpart;
    }
  }

  changeCounterpart() {
    let relPosition = this.holeRelPositions[Math.floor(this.holeRelPositions.length * Math.random())];
    let position = new Point(
      relPosition.x * this.app.screen.width,
      this.app.screen.height - relPosition.y * this.carSprite.height
      - this.relStreetHeight * this.app.screen.height // street offset
    );
    this.counterpartSprite.x = position.x;
    this.counterpartSprite.y = position.y;
    this.counterpartType = this.calculateCounterpartTypeRandomly();
    this.counterpartSprite.texture = this.getTextureFromCounterpartType(false);
  }

  goToState(nextState: GameStates) {
    this.gameState = nextState;
    this.stateText.text = nextState;
    this.stateTime = 0;
    this.updateTurnVariables();
  }
}
