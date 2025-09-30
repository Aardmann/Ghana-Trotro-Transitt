import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
//import AdminApp from "./AdminApp";
import "./index.css";
import "./fixLeafletIcons";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
    {/*<AdminApp />*/}
  </React.StrictMode>
);
