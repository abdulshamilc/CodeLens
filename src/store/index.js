// src/store/index.js
// Central Redux Toolkit store for CodeLens: app, dbv, dbvLayout, and whiteboard

import { configureStore } from "@reduxjs/toolkit";
import appReducer from "./slices/appSlice";
import dbvReducer from "./slices/dbvSlice";
import dbvLayoutReducer from "./slices/dbvLayoutSlice";
import whiteboardReducer from "./slices/whiteboardSlice";

export const store = configureStore({
  reducer: {
    app: appReducer,
    dbv: dbvReducer,
    dbvLayout: dbvLayoutReducer,
    whiteboard: whiteboardReducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: false,
      immutableCheck: false,
    }),
});

export default store;
