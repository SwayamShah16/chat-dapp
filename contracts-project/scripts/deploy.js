const hre = require("hardhat");

async function main() {
  const chat = await hre.ethers.deployContract("Chat");
  await chat.waitForDeployment();
  console.log("Chat deployed to:", await chat.getAddress());
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});