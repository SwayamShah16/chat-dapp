// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract Chat {
    struct Message {
        address sender;
        address receiver; // address(0) means public message
        string text;
        uint256 timestamp;
    }

    uint256 public constant MAX_MESSAGE_LENGTH = 280;
    uint256 public constant MIN_NICKNAME_LENGTH = 3;
    uint256 public constant MAX_NICKNAME_LENGTH = 20;

    Message[] private messages;
    mapping(address => string) public nicknames;

    event MessageSent(
        address indexed sender,
        address indexed receiver,
        string text,
        uint256 timestamp
    );
    event NicknameRegistered(address indexed user, string name);

    function registerNickname(string calldata name) external {
        uint256 len = bytes(name).length;
        require(
            len >= MIN_NICKNAME_LENGTH && len <= MAX_NICKNAME_LENGTH,
            "Nickname must be 3-20 characters"
        );
        nicknames[msg.sender] = name;
        emit NicknameRegistered(msg.sender, name);
    }

    function sendMessage(address to, string calldata text) external {
        uint256 len = bytes(text).length;
        require(len > 0, "Message cannot be empty");
        require(len <= MAX_MESSAGE_LENGTH, "Message too long");

        messages.push(Message(msg.sender, to, text, block.timestamp));
        emit MessageSent(msg.sender, to, text, block.timestamp);
    }

    function getMessages() external view returns (Message[] memory) {
        return messages;
    }

    function getMessageCount() external view returns (uint256) {
        return messages.length;
    }
}