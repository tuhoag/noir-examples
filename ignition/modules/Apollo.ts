import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";
import { upgrades } from "hardhat";

export default buildModule("Apollo1", (m) => {
  const name = m.getParameter("name");
  const rocket = m.contract("Rocket", [name]);



  // upgrades.deployProxy(rocket, )

  return { rocket: rocket };
});