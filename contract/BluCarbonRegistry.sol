// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/token/ERC721/ERC721.sol";

contract BlueCarbonRegistry is ERC721, AccessControl {
    bytes32 public constant ADMIN_ROLE = keccak256("ADMIN_ROLE");
    bytes32 public constant PROJECT_DEVELOPER_ROLE = keccak256("PROJECT_DEVELOPER_ROLE");

    enum Status { Pending, Approved, Rejected }

    struct CarbonProject {
        uint256 id;
        address developer;
        string projectName;
        string developerName;
        string description;
        string geographicCoordinates;
        string siteAddress;
        string projectArea;
        string ecosystemType;
        uint256 startDate;
        string expectedProjectDuration;
        string restorationMethods;
        string baselineCarbonStock;
        string estimatedCarbonSequestration; // total credits as string (could convert to uint in real scenario)
        string supportingDocsHash;
        string contactDetails;
        Status status;
    }

    uint256 public projectCounter;
    uint256 public tokenCounter;

    // Track minted credits per project
    mapping(uint256 => uint256) public mintedCredits;

    mapping(uint256 => CarbonProject) public projects;
    mapping(address => uint256[]) public developerProjects;
    mapping(uint256 => uint256[]) public projectTokens;

    event ProjectSubmitted(uint256 indexed projectId, address indexed developer);
    event ProjectApproved(uint256 indexed projectId);
    event ProjectRejected(uint256 indexed projectId);
    event CarbonCreditMinted(uint256 indexed tokenId, uint256 indexed projectId, address indexed to);

    constructor() ERC721("BlueCarbonCredit", "BCC") {
        // Grant deployer the admin roles
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(ADMIN_ROLE, msg.sender);

        // Make ADMIN_ROLE the admin of PROJECT_DEVELOPER_ROLE
        _setRoleAdmin(PROJECT_DEVELOPER_ROLE, ADMIN_ROLE);
    }

    // Both ERC721 and AccessControl implement supportsInterface
    function supportsInterface(bytes4 interfaceId) public view virtual override(ERC721, AccessControl) returns (bool) {
        return super.supportsInterface(interfaceId);
    }

    modifier onlyAdmin() {
        require(hasRole(ADMIN_ROLE, msg.sender), "Requires admin role");
        _;
    }

    modifier onlyDeveloper() {
        require(hasRole(PROJECT_DEVELOPER_ROLE, msg.sender), "Requires developer role");
        _;
    }

    // Admin can add developers
    function addDeveloper(address developer) external onlyAdmin {
        grantRole(PROJECT_DEVELOPER_ROLE, developer);
    }

    // Project submission
    function submitProject(
        string memory projectName,
        string memory developerName,
        string memory description,
        string memory geographicCoordinates,
        string memory siteAddress,
        string memory projectArea,
        string memory ecosystemType,
        uint256 startDate,
        string memory expectedProjectDuration,
        string memory restorationMethods,
        string memory baselineCarbonStock,
        string memory estimatedCarbonSequestration,
        string memory supportingDocsHash,
        string memory contactDetails
    ) external onlyDeveloper {
        projectCounter++;
        projects[projectCounter] = CarbonProject(
            projectCounter,
            msg.sender,
            projectName,
            developerName,
            description,
            geographicCoordinates,
            siteAddress,
            projectArea,
            ecosystemType,
            startDate,
            expectedProjectDuration,
            restorationMethods,
            baselineCarbonStock,
            estimatedCarbonSequestration,
            supportingDocsHash,
            contactDetails,
            Status.Pending
        );
        developerProjects[msg.sender].push(projectCounter);
        emit ProjectSubmitted(projectCounter, msg.sender);
    }

    // Admin approval
    function approveProject(uint256 projectId) external onlyAdmin {
        require(projects[projectId].status == Status.Pending, "Project not pending");
        projects[projectId].status = Status.Approved;
        emit ProjectApproved(projectId);
    }

    // Admin rejection
    function rejectProject(uint256 projectId) external onlyAdmin {
        require(projects[projectId].status == Status.Pending, "Project not pending");
        projects[projectId].status = Status.Rejected;
        emit ProjectRejected(projectId);
    }

    // Mint carbon credits (Admin specifies amount)
    function mintCarbonCredit(uint256 projectId, address to, uint256 amount) external onlyAdmin {
        CarbonProject storage project = projects[projectId];
        require(project.status == Status.Approved, "Project not approved");

        // Convert estimatedCarbonSequestration to uint
        uint256 totalCredits = stringToUint(project.estimatedCarbonSequestration);
        uint256 alreadyMinted = mintedCredits[projectId];

        require(alreadyMinted < totalCredits, "All credits already minted");
        require(amount > 0, "Amount must be > 0");
        require(alreadyMinted + amount <= totalCredits, "Cannot mint more than estimated credits");

        for (uint256 i = 0; i < amount; i++) {
            tokenCounter++;
            _safeMint(to, tokenCounter);
            projectTokens[projectId].push(tokenCounter);
            emit CarbonCreditMinted(tokenCounter, projectId, to);
        }

        mintedCredits[projectId] += amount;
    }

    // Convert string to uint (basic)
    function stringToUint(string memory s) internal pure returns (uint256 result) {
        bytes memory b = bytes(s);
        for (uint i = 0; i < b.length; i++) {
            require(b[i] >= 0x30 && b[i] <= 0x39, "Invalid character in number");
            result = result * 10 + (uint8(b[i]) - 48);
        }
    }

    // Get all projects by developer
    function getDeveloperProjects(address developer) external view returns (uint256[] memory) {
        return developerProjects[developer];
    }

    // Get all token IDs for a project
    function getProjectTokens(uint256 projectId) external view returns (uint256[] memory) {
        return projectTokens[projectId];
    }
}