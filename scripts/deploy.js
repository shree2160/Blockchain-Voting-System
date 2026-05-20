const hre = require("hardhat");
const fs  = require("fs");
const path = require("path");

async function main() {
  const [deployer] = await hre.ethers.getSigners();
  console.log("🚀 Deploying AdvancedVoting with account:", deployer.address);
  console.log(
    "   Balance:",
    hre.ethers.formatEther(await deployer.provider.getBalance(deployer.address)),
    "ETH"
  );

  // ── Election duration: 60 minutes by default, override via env ───────────
  const DURATION_MINUTES = Number(process.env.ELECTION_DURATION_MINUTES) || 60;

  const AdvancedVoting = await hre.ethers.getContractFactory("AdvancedVoting");
  const contract = await AdvancedVoting.deploy(DURATION_MINUTES, deployer.address);
  await contract.waitForDeployment();

  const address = await contract.getAddress();
  console.log(`✅ AdvancedVoting deployed to: ${address}`);
  console.log(`   Election deadline: ${DURATION_MINUTES} minutes from now`);

  console.log("\n📋 Skipping candidate seeding for production/dashboard registration.");

  // ── Copy ABI to frontend ──────────────────────────────────────────────────
  const artifactPath = path.join(
    __dirname,
    "../artifacts/contracts/AdvancedVoting.sol/AdvancedVoting.json"
  );
  const frontendAbiDir = path.join(__dirname, "../frontend/src/abis");

  if (fs.existsSync(artifactPath)) {
    if (!fs.existsSync(frontendAbiDir)) fs.mkdirSync(frontendAbiDir, { recursive: true });
    const artifact = JSON.parse(fs.readFileSync(artifactPath, "utf8"));
    const abiExport = { abi: artifact.abi, address };
    fs.writeFileSync(
      path.join(frontendAbiDir, "AdvancedVoting.json"),
      JSON.stringify(abiExport, null, 2)
    );
    console.log("\n📦 ABI + address written to frontend/src/abis/AdvancedVoting.json");
  } else {
    console.warn("\n⚠️  Artifact not found — run `npm run compile` first.");
  }

  console.log("\n🎉 Deployment complete!");
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
