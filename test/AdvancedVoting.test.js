const { expect } = require("chai");
const hre = require("hardhat");

describe("AdvancedVoting", function () {
  let contract, admin, voter1, voter2, stranger;
  const DURATION = 60; // minutes

  beforeEach(async () => {
    [admin, voter1, voter2, stranger] = await hre.ethers.getSigners();
    const Factory = await hre.ethers.getContractFactory("AdvancedVoting");
    contract = await Factory.deploy(DURATION, admin.address);
    await contract.waitForDeployment();

    // Add two candidates
    await contract.addCandidate("Alice", "https://img/alice", "Vote Alice!");
    await contract.addCandidate("Bob",   "https://img/bob",   "Vote Bob!");
  });

  // ── Admin guards ──────────────────────────────────────────────────────────
  it("should set deployer as admin", async () => {
    expect(await contract.admin()).to.equal(admin.address);
  });

  it("rejects non-admin from whitelisting", async () => {
    await expect(
      contract.connect(stranger).whitelistAnonymousWallet(voter1.address)
    ).to.be.revertedWith("AV: caller is not admin");
  });

  // ── Whitelisting ──────────────────────────────────────────────────────────
  it("whitelists a wallet", async () => {
    await contract.whitelistAnonymousWallet(voter1.address);
    expect(await contract.validAnonymousWallets(voter1.address)).to.be.true;
  });

  it("batch whitelists wallets", async () => {
    await contract.batchWhitelistWallets([voter1.address, voter2.address]);
    expect(await contract.validAnonymousWallets(voter1.address)).to.be.true;
    expect(await contract.validAnonymousWallets(voter2.address)).to.be.true;
  });

  it("allows voter to register with a valid signature from campusAuthority", async () => {
    const messageHash = hre.ethers.solidityPackedKeccak256(["address"], [voter1.address]);
    const signature = await admin.signMessage(hre.ethers.getBytes(messageHash));
    
    await contract.connect(voter1).registerVoter(signature);
    expect(await contract.validAnonymousWallets(voter1.address)).to.be.true;
  });

  it("rejects voter self-registration with an invalid signature", async () => {
    const messageHash = hre.ethers.solidityPackedKeccak256(["address"], [voter1.address]);
    const signature = await stranger.signMessage(hre.ethers.getBytes(messageHash));
    
    await expect(
      contract.connect(voter1).registerVoter(signature)
    ).to.be.revertedWith("AV: invalid campus authorization");
  });

  // ── Voting ────────────────────────────────────────────────────────────────
  it("allows whitelisted voter to cast a vote", async () => {
    await contract.whitelistAnonymousWallet(voter1.address);
    await contract.connect(voter1).vote(0);
    const candidates = await contract.getAllCandidates();
    expect(candidates[0].voteCount).to.equal(1n);
  });

  it("rejects non-whitelisted voter", async () => {
    await expect(contract.connect(stranger).vote(0)).to.be.revertedWith(
      "AV: wallet not authorized"
    );
  });

  // ── Anti-Coercion override ────────────────────────────────────────────────
  it("correctly overrides a previous vote", async () => {
    await contract.whitelistAnonymousWallet(voter1.address);

    // First vote: Alice (id=0)
    await contract.connect(voter1).vote(0);
    let c = await contract.getAllCandidates();
    expect(c[0].voteCount).to.equal(1n);
    expect(c[1].voteCount).to.equal(0n);

    // Override: Bob (id=1)
    await contract.connect(voter1).vote(1);
    c = await contract.getAllCandidates();
    expect(c[0].voteCount).to.equal(0n); // Alice's vote was removed
    expect(c[1].voteCount).to.equal(1n); // Bob now has it
  });

  it("records the correct override state in voterRecords", async () => {
    await contract.whitelistAnonymousWallet(voter1.address);
    await contract.connect(voter1).vote(0);
    await contract.connect(voter1).vote(1);
    const record = await contract.voterRecords(voter1.address);
    expect(record.candidateId).to.equal(1n);
    expect(record.hasVoted).to.be.true;
  });

  // ── Time lock ─────────────────────────────────────────────────────────────
  it("blocks voting after deadline", async () => {
    await contract.whitelistAnonymousWallet(voter1.address);

    // Fast-forward time past election deadline
    await hre.network.provider.send("evm_increaseTime", [DURATION * 60 + 1]);
    await hre.network.provider.send("evm_mine");

    await expect(contract.connect(voter1).vote(0)).to.be.revertedWith(
      "AV: election period has ended"
    );
  });

  // ── Winner ────────────────────────────────────────────────────────────────
  it("returns correct winner after deadline", async () => {
    await contract.whitelistAnonymousWallet(voter1.address);
    await contract.whitelistAnonymousWallet(voter2.address);
    await contract.connect(voter1).vote(0);
    await contract.connect(voter2).vote(0);

    await hre.network.provider.send("evm_increaseTime", [DURATION * 60 + 1]);
    await hre.network.provider.send("evm_mine");

    const [winnerId, winnerName, votes] = await contract.getWinner();
    expect(winnerId).to.equal(0n);
    expect(winnerName).to.equal("Alice");
    expect(votes).to.equal(2n);
  });
});
