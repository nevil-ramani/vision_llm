import React from "react";


export default function BaseLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <main className="h-auto overflow-auto">{children}</main>
    </>
  );
}
