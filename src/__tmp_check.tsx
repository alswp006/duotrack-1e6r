import React from "react";
async function importPage() {
  const mod = await import("./__tmp_check2");
  return mod.default;
}
async function run() {
  const Foo = await importPage();
  React.createElement(Foo);
}
