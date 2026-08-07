import { configureStore } from "@reduxjs/toolkit";
import cart from "./cartSlice";

export const makeStore = () => configureStore({ reducer: { cart } });
export type AppStore = ReturnType<typeof makeStore>;
export type RootState = ReturnType<AppStore["getState"]>;
export type AppDispatch = AppStore["dispatch"];
