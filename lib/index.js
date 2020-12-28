exports.signPermit = async (contractAddress, holder, spender, nonce, expiry, chainId) => {
  if (chainId === undefined) {
    const result = await web3.eth.net.getId();
    chainId = parseInt(result);
  }

  const domain = [
    { name: "name", type: "string" },
    { name: "version", type: "string" },
    { name: "chainId", type: "uint256" },
    { name: "verifyingContract", type: "address" }
  ];

  const permit = [
    { name: "holder", type: "address" },
    { name: "spender", type: "address" },
    { name: "nonce", type: "uint256" },
    { name: "expiry", type: "uint256" },
    { name: "allowed", type: "bool" },
  ];

  const domainData = {
    name: "Dai Stablecoin",
    version: "1",
    chainId: chainId,
    verifyingContract: contractAddress
  };

  const message = {
    holder,
    spender,
    nonce,
    expiry,
    allowed: true,
  };

  const data = {
    types: {
      EIP712Domain: domain,
      Permit: permit,
    },
    primaryType: "Permit",
    domain: domainData,
    message: message
  };

  return new Promise((resolve, reject) => {
    web3.currentProvider.send({
      jsonrpc: '2.0',
      id: Date.now().toString().substring(9),
      method: "eth_signTypedData",
      params: [holder, data],
      from: holder
    }, (error, res) => {
      if (error) {
        return reject(error);
      }

      resolve(res.result);
    });
  });
}
