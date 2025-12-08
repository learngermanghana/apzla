import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App.jsx";
import CheckinPage from "./components/checkin/CheckinPage.jsx";
import StatusPage from "./components/status/StatusPage.jsx";
import "./index.css";

const currentPath = window.location.pathname;
const isCheckinRoute = currentPath.startsWith("/checkin");
const isStatusRoute = currentPath.startsWith("/status");
const RootComponent = isCheckinRoute ? CheckinPage : isStatusRoute ? StatusPage : App;

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <RootComponent />
  </React.StrictMode>
);
