"use client";
import { useSelector } from "react-redux";
import type { RootState } from "../app/store";

export default function Header() {
  const selectedSubMenu = useSelector((state: RootState) => state.navigation.selectedSubMenu);
  return (
    <header
      style={{
        background: "#fff",
        height: 64,
        minHeight: 64,
        width: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontWeight: 600,
        fontSize: 20,
        letterSpacing: 0.2,
        color: "#23235a",
      }}
    >
      {selectedSubMenu || ""}
    </header>
  );
} 