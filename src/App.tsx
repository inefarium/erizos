import { Corazon3D } from './components/Corazon3D';
import { Titulo } from './components/Titulo';

export default function App() {
  return (
    <>
      <div className="contenedor">
        <Titulo texto="En un mundo de tibios...." variante="cyan" tono="alto" />
        <Titulo texto="Estamos erizos...." variante="pink" tono="bajo" />
      </div>
      <Corazon3D />
    </>
  );
}
