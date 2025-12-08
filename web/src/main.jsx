import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App.jsx";
import CheckinPage from "./components/checkin/CheckinPage.jsx";
import "./index.css";

const isCheckinRoute = window.location.pathname.startsWith("/checkin");
const RootComponent = isCheckinRoute ? CheckinPage : App;

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <RootComponent />
  </React.StrictMode>
);
