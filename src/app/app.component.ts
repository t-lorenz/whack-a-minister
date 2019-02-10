import { Component, OnInit, ViewChild } from '@angular/core';
import { Sprite, Application, Sound, Rectangle, Texture, Container, DisplayObject, Text, loader } from 'pixi.js';
//import * as PIXI from "pixi.js/dist/pixi.js"
declare var PIXI: any; // instead of importing pixi like some tutorials say to do use declare

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})




export class AppComponent implements OnInit {
  // List of files to load
  private manifest = {
    enemyImage: 'assets/images/scheuer.png',
    handImage: 'assets/images/hand.png',
    handSmackingImage: 'assets/images/hand-smacking.png',
    clapSound: 'assets/sounds/clap.mp3'
  };

  title = 'Scheuer-Den-Scheuer';

  @ViewChild('pixiContainer') pixiContainer; // this allows us to reference and load stuff into the div container
  public app: Application; // this will be our pixi application
  public state;
  private enemySprite: Sprite;
  private cursorSprite: Sprite;
  private enemyCommentText: Text;

  ngOnInit() {

    this.app = new PIXI.Application({ width: 800, height: 600, backgroundColor: 0x1099bb }); // this creates our pixi application

    this.pixiContainer.nativeElement.appendChild(this.app.view); // this places our pixi application onto the viewable document

    let type = "WebGL"
    if (!PIXI.utils.isWebGLSupported()) {
      type = "canvas"
    }

    //PIXI.sound.add('clap', 'assets/sounds/clap.mp3');
    //PIXI.sound.play('bird');

    // set mouse cursor
    //var defaultIcon = "url('assets/images/hand.png'),auto";
    //var hoverIcon = "url('required/assets/hand-smacking.png'),auto";



    //this.pixiContainer.cursor = "url('required/assets/hand.png'),auto";
    //this.app.renderer.plugins.interaction.cursorStyles.hover = hoverIcon;
    // Add to the PIXI loader
    for (let name in this.manifest) {
      PIXI.loader.add(name, this.manifest[name]);
    }

    PIXI.loader.
      on("progress", this.onLoad).
      load(this.setup.bind(this));

    this.app.ticker.add(this.update.bind(this));
  }

  onLoad(loader, resource) {
    console.log(`loaded ${resource.url}. Loading is ${loader.progress}% complete.`);
  }

  setupText() {
    this.enemyCommentText = new PIXI.Text('AUA! Friss Staub!');
    this.enemyCommentText.x = this.enemySprite.x - this.enemyCommentText.width / 2;
    this.enemyCommentText.y = this.enemySprite.y - this.enemySprite.height / 2 - this. enemyCommentText.height;

    this.app.stage.addChild(this.enemyCommentText);
  }

  setupCursor() {
    this.app.renderer.plugins.interaction.cursorStyles.default = 'none';

    let interaction = this.app.renderer.plugins.interaction;

    this.cursorSprite = new PIXI.Sprite(
      PIXI.loader.resources['handImage'].texture
    );

    this.cursorSprite.anchor.set(0.35, 0.25); // position specific to where the actual cursor point is
    this.app.stage.addChild(this.cursorSprite);

    interaction.on("pointerover", () => {
      this.cursorSprite.visible = true;
    });
    interaction.on("pointerout", () => {
      this.cursorSprite.visible = false;
    });
    interaction.on("pointermove", (event) => {
      this.cursorSprite.position = event.data.global;
    });
  }

  setupEnemy() {
    this.enemySprite = new PIXI.Sprite(
      PIXI.loader.resources['enemyImage'].texture
    );

    this.enemySprite.anchor.set(0.5);
    this.enemySprite.scale.x *= 0.75;
    this.enemySprite.scale.y *= 0.75;

    this.enemySprite.interactive = true;
    this.enemySprite.on("pointerdown", this.onPointerDown.bind(this));
    this.enemySprite.on("pointerup", this.onPointerUp.bind(this));

    this.enemySprite.position.set(this.app.renderer.view.width / 2, this.app.screen.height / 2);

    this.app.stage.addChild(this.enemySprite);
  }

  setup() {
    this.setupEnemy();
    this.setupCursor();
    this.setupText();
  }

  onPointerDown() {
    let clapSound: Sound = PIXI.loader.resources['clapSound'].data;
    clapSound.play();

    this.cursorSprite.texture = PIXI.loader.resources['handSmackingImage'].texture;
    this.enemyCommentText.visible = true;
    this.enemySprite.scale.x -= 0.1;
    this.enemySprite.scale.y -= 0.1;
  }

  onPointerUp() {
    this.cursorSprite.texture = PIXI.loader.resources['handImage'].texture;
    this.enemyCommentText.visible = false;
    this.enemySprite.scale.x += 0.1;
    this.enemySprite.scale.y += 0.1;
  }

  update(delta: number) {
    //this.enemy.rotation += 0.1 * delta;
  }
}
