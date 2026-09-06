import React from "react";
import { createRoot } from "react-dom/client";
import { Provider } from "react-redux";
import App from "./App";
import { store } from "./store";
import { setupIonicReact } from "@ionic/react";
import { addIcons } from "ionicons";
import {
  alertCircle,
  basketOutline,
  busOutline,
  cartOutline,
  checkmarkCircle,
  closeCircle,
  ellipsisHorizontalOutline,
  flashOutline,
  gameControllerOutline,
  homeOutline,
  medkitOutline,
  peopleOutline,
  receiptOutline,
  repeatOutline,
  shieldCheckmarkOutline,
  tvOutline,
  walletOutline,
  warning,
} from "ionicons/icons";

setupIonicReact();

addIcons({
  "alert-circle": alertCircle,
  "basket-outline": basketOutline,
  "bus-outline": busOutline,
  "cart-outline": cartOutline,
  "checkmark-circle": checkmarkCircle,
  "close-circle": closeCircle,
  "ellipsis-horizontal-outline": ellipsisHorizontalOutline,
  "flash-outline": flashOutline,
  "game-controller-outline": gameControllerOutline,
  "home-outline": homeOutline,
  "medkit-outline": medkitOutline,
  "people-outline": peopleOutline,
  "receipt-outline": receiptOutline,
  "repeat-outline": repeatOutline,
  "shield-checkmark-outline": shieldCheckmarkOutline,
  "tv-outline": tvOutline,
  "wallet-outline": walletOutline,
  warning,
});

import "@ionic/react/css/core.css";
import "@ionic/react/css/normalize.css";
import "@ionic/react/css/structure.css";
import "@ionic/react/css/typography.css";
import "@ionic/react/css/padding.css";
import "@ionic/react/css/float-elements.css";
import "@ionic/react/css/text-alignment.css";
import "@ionic/react/css/text-transformation.css";
import "@ionic/react/css/flex-utils.css";
import "@ionic/react/css/display.css";

import "./theme/variables.css";
import "./theme/global.css";

const container = document.getElementById("root");
if (!container) {
  throw new Error("root element missing");
}

createRoot(container).render(
  <React.StrictMode>
    <Provider store={store}>
      <App />
    </Provider>
  </React.StrictMode>,
);
