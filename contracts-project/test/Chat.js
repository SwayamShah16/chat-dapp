const { expect } = require("chai");
const { ethers } = require("hardhat");
const { loadFixture } = require("@nomicfoundation/hardhat-toolbox/network-helpers");
const { anyValue } = require("@nomicfoundation/hardhat-chai-matchers/withArgs");

describe("Chat", function () {
  async function deployChat() {
    const [alice, bob] = await ethers.getSigners();
    const chat = await ethers.deployContract("Chat");
    return { chat, alice, bob };
  }

  it("sets a nickname", async function () {
    const { chat, alice } = await loadFixture(deployChat);
    await chat.registerNickname("Alice");
    expect(await chat.nicknames(alice.address)).to.equal("Alice");
  });

  it("rejects a nickname that is too short or too long", async function () {
    const { chat } = await loadFixture(deployChat);
    await expect(chat.registerNickname("ab")).to.be.revertedWith(
      "Nickname must be 3-20 characters"
    );
    await expect(chat.registerNickname("a".repeat(21))).to.be.revertedWith(
      "Nickname must be 3-20 characters"
    );
  });

  it("stores a public message", async function () {
    const { chat, alice } = await loadFixture(deployChat);
    await chat.sendMessage(ethers.ZeroAddress, "hello");
    const msgs = await chat.getMessages();
    expect(msgs.length).to.equal(1);
    expect(msgs[0].sender).to.equal(alice.address);
    expect(msgs[0].receiver).to.equal(ethers.ZeroAddress);
    expect(msgs[0].text).to.equal("hello");
  });

  it("stores a direct message with the right receiver", async function () {
    const { chat, bob } = await loadFixture(deployChat);
    await chat.sendMessage(bob.address, "hi bob");
    const msgs = await chat.getMessages();
    expect(msgs[0].receiver).to.equal(bob.address);
  });

  it("rejects an empty message", async function () {
    const { chat } = await loadFixture(deployChat);
    await expect(chat.sendMessage(ethers.ZeroAddress, "")).to.be.revertedWith(
      "Message cannot be empty"
    );
  });

  it("enforces the 280 character limit", async function () {
    const { chat } = await loadFixture(deployChat);
    await chat.sendMessage(ethers.ZeroAddress, "a".repeat(280)); // allowed
    await expect(
      chat.sendMessage(ethers.ZeroAddress, "a".repeat(281))
    ).to.be.revertedWith("Message too long");
  });

  it("emits MessageSent", async function () {
    const { chat, alice } = await loadFixture(deployChat);
    await expect(chat.sendMessage(ethers.ZeroAddress, "hello"))
      .to.emit(chat, "MessageSent")
      .withArgs(alice.address, ethers.ZeroAddress, "hello", anyValue);
  });
});