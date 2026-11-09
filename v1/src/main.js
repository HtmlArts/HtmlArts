import { mountApplication } from "./core/application.js";
import "./styles.css";

mountApplication(document).catch((error) => {
  console.error("HtmlArts startup failed.", error);
});
