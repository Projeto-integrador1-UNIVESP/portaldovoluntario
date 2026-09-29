import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import { instalarMensagensPtBr } from "./lib/zodPtBr";
import "./index.css";

instalarMensagensPtBr();

createRoot(document.getElementById("root")!).render(<App />);
