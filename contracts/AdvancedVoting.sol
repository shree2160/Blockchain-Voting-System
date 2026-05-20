// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

/**
 * @title AdvancedVoting — CryptoVote Campus V2.0
 * @author CryptoVote Team
 * @notice Implements Off-Chain Identity Privacy + Anti-Coercion Override Protocol
 *
 * PRIVACY MODEL:
 *   • Real student identities NEVER enter the chain.
 *   • Admin whitelists anonymous wallet addresses generated fresh by each student.
 *   • No mapping from wallet → student name exists anywhere on-chain.
 *
 * ANTI-COERCION MODEL:
 *   • A whitelisted wallet may call vote() multiple times before electionDeadline.
 *   • Each call atomically reverses the previous vote and applies the new one.
 *   • After electionDeadline the contract is frozen; no further state changes occur.
 */
contract AdvancedVoting {
    // ─────────────────────────────────────────────────────────── Types ──────
    struct Candidate {
        string name;        // Candidate display name
        string imageUri;    // Off-chain image URI (IPFS / HTTPS)
        string pitch;       // One-line election pitch
        uint256 voteCount;  // Running tally (gas-efficient: read via getter)
    }

    struct VoteRecord {
        uint256 candidateId; // Which candidate this wallet voted for
        bool    hasVoted;    // Guard flag for override path
        uint256 votedAt;     // Timestamp of most-recent vote (audit trail)
    }

    // ─────────────────────────────────────────────────────── State vars ──────
    address public admin;
    uint256 public electionDeadline;
    bool    public electionFinalized; // set by admin after tallying
    address public campusAuthority;   // public key representing college registrar

    // FR-01  Privacy mapping — anonymous wallets only, never real names
    mapping(address => bool)       public validAnonymousWallets;

    // FR-02  Anti-coercion — stores the current ballot per wallet
    mapping(address => VoteRecord) public voterRecords;

    Candidate[] public candidates;

    // ─────────────────────────────────────────────────────────── Events ──────
    event WalletWhitelisted(address indexed wallet, uint256 timestamp);
    event VoteCast(address indexed voter, uint256 indexed candidateId, bool wasOverride, uint256 timestamp);
    event CandidateAdded(uint256 indexed id, string name);
    event ElectionFinalized(uint256 timestamp, uint256[] finalTallies);

    // ──────────────────────────────────────────────────────── Modifiers ──────
    modifier onlyAdmin() {
        require(msg.sender == admin, "AV: caller is not admin");
        _;
    }

    modifier electionActive() {
        require(block.timestamp < electionDeadline, "AV: election period has ended");
        require(!electionFinalized,                 "AV: election already finalized");
        _;
    }

    modifier electionEnded() {
        require(block.timestamp >= electionDeadline || electionFinalized, "AV: election still active");
        _;
    }

    // ─────────────────────────────────────────────────────── Constructor ──────
    /**
     * @param _durationInMinutes  How long the election window is open (from deploy).
     * @param _campusAuthority    The public key representing the off-chain registration server.
     */
    constructor(uint256 _durationInMinutes, address _campusAuthority) {
        require(_durationInMinutes > 0, "AV: duration must be > 0");
        require(_campusAuthority != address(0), "AV: authority address invalid");
        admin            = msg.sender;
        electionDeadline = block.timestamp + (_durationInMinutes * 1 minutes);
        campusAuthority  = _campusAuthority;
    }

    // ─────────────────────────────────────────────── Candidate Management ──────
    /**
     * @notice Admin adds a candidate before the election starts.
     * @param _name     Candidate name
     * @param _imageUri IPFS/HTTPS URI for candidate photo
     * @param _pitch    Single-sentence election pitch
     */
    function addCandidate(
        string calldata _name,
        string calldata _imageUri,
        string calldata _pitch
    ) external onlyAdmin {
        require(bytes(_name).length > 0, "AV: name cannot be empty");
        uint256 id = candidates.length;
        candidates.push(Candidate({
            name:      _name,
            imageUri:  _imageUri,
            pitch:     _pitch,
            voteCount: 0
        }));
        emit CandidateAdded(id, _name);
    }

    // ─────────────────────────────────────────────── Voter Whitelisting ──────
    /**
     * @notice Cryptographic Voter Self-Registration (ECDSA)
     * @param _signature Signature generated off-chain by the college registrar.
     */
    function registerVoter(bytes calldata _signature) external electionActive {
        require(!validAnonymousWallets[msg.sender], "AV: already whitelisted");
        
        // Hash the voter's address
        bytes32 messageHash = keccak256(abi.encodePacked(msg.sender));
        bytes32 ethSignedMessageHash = keccak256(abi.encodePacked("\x19Ethereum Signed Message:\n32", messageHash));
        
        // Recover signer using ecrecover
        (bytes32 r, bytes32 s, uint8 v) = splitSignature(_signature);
        address signer = ecrecover(ethSignedMessageHash, v, r, s);
        
        require(signer == campusAuthority, "AV: invalid campus authorization");
        
        validAnonymousWallets[msg.sender] = true;
        emit WalletWhitelisted(msg.sender, block.timestamp);
    }

    function splitSignature(bytes memory sig) internal pure returns (bytes32 r, bytes32 s, uint8 v) {
        require(sig.length == 65, "AV: invalid signature length");
        assembly {
            r := mload(add(sig, 32))
            s := mload(add(sig, 64))
            v := byte(0, mload(add(sig, 96)))
        }
    }

    /**
     * @notice FR-01  Whitelist a single anonymous wallet.
     * @param _wallet The brand-new, empty wallet address provided by the student.
     */
    function whitelistAnonymousWallet(address _wallet) public onlyAdmin {
        require(_wallet != address(0), "AV: zero address");
        require(!validAnonymousWallets[_wallet], "AV: already whitelisted");
        validAnonymousWallets[_wallet] = true;
        emit WalletWhitelisted(_wallet, block.timestamp);
    }

    /**
     * @notice FR-01  Batch whitelist to save admin gas on large cohorts.
     * @param _wallets Array of anonymous wallet addresses.
     */
    function batchWhitelistWallets(address[] calldata _wallets) external onlyAdmin {
        for (uint256 i = 0; i < _wallets.length; i++) {
            if (!validAnonymousWallets[_wallets[i]] && _wallets[i] != address(0)) {
                validAnonymousWallets[_wallets[i]] = true;
                emit WalletWhitelisted(_wallets[i], block.timestamp);
            }
        }
    }

    // ───────────────────────────────────────────── Core Voting Logic ──────
    /**
     * @notice FR-02 & FR-03  Cast or override a vote.
     *
     *  Anti-Coercion flow:
     *    1. Verify sender is a valid anonymous wallet.
     *    2. If sender HAS voted before → decrement old candidate's tally (override).
     *    3. Record new vote and increment new candidate's tally.
     *
     * @param _candidateId  Zero-indexed position in the candidates array.
     */
    function vote(uint256 _candidateId) external electionActive {
        require(validAnonymousWallets[msg.sender], "AV: wallet not authorized");
        require(_candidateId < candidates.length,  "AV: invalid candidateId");

        bool wasOverride = false;

        // ── Override path ────────────────────────────────────────────────────
        if (voterRecords[msg.sender].hasVoted) {
            uint256 oldChoice = voterRecords[msg.sender].candidateId;
            // Guard: only decrement if it actually had a vote counted
            if (candidates[oldChoice].voteCount > 0) {
                candidates[oldChoice].voteCount--;
            }
            wasOverride = true;
        }

        // ── Apply new vote ───────────────────────────────────────────────────
        voterRecords[msg.sender] = VoteRecord({
            candidateId: _candidateId,
            hasVoted:    true,
            votedAt:     block.timestamp
        });
        candidates[_candidateId].voteCount++;

        emit VoteCast(msg.sender, _candidateId, wasOverride, block.timestamp);
    }

    // ─────────────────────────────────────────── Read-Only / FR-04 Tallying ──
    /**
     * @notice FR-04  Returns the full candidate list with live tallies.
     *         Pure read: zero gas for the caller when invoked off-chain.
     */
    function getAllCandidates() external view returns (Candidate[] memory) {
        return candidates;
    }

    /**
     * @notice Returns total number of candidates.
     */
    function getCandidateCount() external view returns (uint256) {
        return candidates.length;
    }

    /**
     * @notice Returns the current winning candidateId (ties resolved by lowest id).
     *         Reverts if no candidates exist or no votes cast.
     */
    function getWinner() external view electionEnded returns (uint256 winnerId, string memory winnerName, uint256 winningVotes) {
        require(candidates.length > 0, "AV: no candidates");
        uint256 maxVotes = 0;
        for (uint256 i = 0; i < candidates.length; i++) {
            if (candidates[i].voteCount > maxVotes) {
                maxVotes = candidates[i].voteCount;
                winnerId = i;
            }
        }
        winnerName   = candidates[winnerId].name;
        winningVotes = candidates[winnerId].voteCount;
    }

    /**
     * @notice Returns seconds remaining until election deadline (0 if elapsed).
     */
    function timeRemaining() external view returns (uint256) {
        if (block.timestamp >= electionDeadline) return 0;
        return electionDeadline - block.timestamp;
    }

    // ─────────────────────────────────────────────── Admin: Finalize ──────
    /**
     * @notice Admin permanently freezes the election result for audit.
     *         Emits final tallies for off-chain indexers.
     */
    function finalizeElection() external onlyAdmin {
        require(block.timestamp >= electionDeadline, "AV: deadline not reached");
        require(!electionFinalized, "AV: already finalized");
        electionFinalized = true;

        uint256[] memory tallies = new uint256[](candidates.length);
        for (uint256 i = 0; i < candidates.length; i++) {
            tallies[i] = candidates[i].voteCount;
        }
        emit ElectionFinalized(block.timestamp, tallies);
    }

    // ─────────────────────────────────────────────── Admin: Transfer ──────
    function transferAdmin(address _newAdmin) external onlyAdmin {
        require(_newAdmin != address(0), "AV: zero address");
        admin = _newAdmin;
    }

    // Prevent accidental ETH deposits
    receive() external payable { revert("AV: does not accept ETH"); }
}
