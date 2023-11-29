
# Biconomy Custom session storage tutorial

This Repository is used in the custom session storage guide for the [Biconomy SDK](https://docs.biconomy.io/docs/quickstart) as well as the Node JS guides.

The main purpose of this repository is to implement a custom file storage and use as session storage. 

## Installation

Clone this repository and then run

```bash
  npm i
```
Alternatively you can use `npm` or `pnpm` if that suits you. 

## Run

It includes a script to create session and session details will be saved in files. One will need to create two file in the root folder with ${ smartAccountAddress }_sessions.json and ${ smartAccountAddress }_signers.json names. For instance, if the account address is 0x123 then create 0x123_sessions.json and 0x123_signers.json.

```bash
  npx ts-node ./src/index.ts  // creates session
```

It also contains a script to execute ERC20 transfers using that session.
The smart account must have the necessary funds to execute the transactions, and this operation will take place on the Mumbai testnet. Specifically, the transfers involve USDC, so it is essential for the smart account to hold both USDC and Matic tokens.

```bash
  npx ts-node ./src/erc20Transfer.ts // execute ERC20 transactions
```

## Pull requests welcome

Have any improvements to be made? Feel free to make a Pull Request! 