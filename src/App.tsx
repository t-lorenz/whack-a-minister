import { Box } from '@react-three/drei';
import './App.css';

//import { Train } from './components/three/Train';
import { Enemy } from './components/three/Enemy';
import { FullScreenCanvas } from './components/three/FullScreenCanvas';
import { Train } from './components/three/Train';

function App() {
  return (
    <div>
      <FullScreenCanvas>
        <Box args={[1, 1, 1]}>
          <meshBasicMaterial color="red" />
        </Box>
        <Train coachCode="avz" />
        <Enemy index={0} />
      </FullScreenCanvas>
    </div>
  );
}

export default App;
