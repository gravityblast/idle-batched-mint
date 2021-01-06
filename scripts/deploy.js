const hre = require("hardhat");
const rl = require("readline");
const { ethers, upgrades } = require("hardhat");
const { IdleTokens } = require("../lib");

const prompt = (question) => {
  const r = rl.createInterface({
    input: process.stdin,
    output: process.stdout,
    terminal: false
  });

  return new Promise((resolve, error) => {
    r.question(question, answer => {
      r.close()
      resolve(answer)
    });
  })
}

const Transport = require("@ledgerhq/hw-transport-node-hid").default;
const Eth = require("@ledgerhq/hw-app-eth").default;

class HardwareSigner extends ethers.Signer {
  constructor(provider, type, path) {
    super(provider, type, path);
    const defaultPath = "m/44'/60'/0'/0/0";
    if (path == null) { path = defaultPath; }
    if (type == null) { type = "default"; }

    ethers.utils.defineReadOnly(this, "path", path);
    ethers.utils.defineReadOnly(this, "type", type);
    ethers.utils.defineReadOnly(this, "provider", provider || null);
  }

  async getAddress() {
    const transport = await Transport.create();
    const eth = new Eth(transport);
    const result = await eth.getAddress("m/44'/60'/0'/0/0");
    return result;
  }

  async signTransaction_(transaction) {
    const transport = await Transport.create();
    const eth = new Eth(transport);
    const tx = await ethers.utils.resolveProperties(transaction);
    const baseTx = {
      chainId: (tx.chainId || undefined),
      data: (tx.data || undefined),
      gasLimit: (tx.gasLimit || undefined),
      gasPrice: (tx.gasPrice || undefined),
      nonce: (tx.nonce ? ethers.BigNumber.from(tx.nonce).toNumber() : undefined),
      to: (tx.to || undefined),
      value: (tx.value || undefined),
    };

    const unsignedTx = ethers.utils.serializeTransaction(baseTx).substring(2);
    const result = await eth.signTransaction("m/44'/60'/0'/0/0", unsignedTx);
    return result;
  }
}

async function main() {
  const network = hre.network.name;
  const signer = new HardwareSigner(ethers.provider);
  const account = await signer.getAddress();

  console.log("runing on network", hre.network.name)
  console.log("deploying with account", account.address);
  console.log("account balance", web3.utils.fromWei(await web3.eth.getBalance(account.address)).toString(), "\n\n");

  const answer = await prompt("continue? [y/n]");
  if (answer !== "y" && answer !== "yes") {
    console.log("exiting...");
    process.exit(1);
  }

  console.log("starting...")

  for (token in IdleTokens[network]) {
    const tokenAddress = IdleTokens[network][token];
    console.log(`deploying IdleBatchedMint for ${token} (${tokenAddress})`);
    const IdleBatchedMint = await ethers.getContractFactory("IdleBatchedMint", signer);
    const args = [tokenAddress];
    const proxy = await upgrades.deployProxy(IdleBatchedMint, args);
    await proxy.deployed();
    console.log(`${token} proxy deployed at`, proxy.address)
    console.log("***************************************************************************************");
  }
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });
