import { defaultAbiCoder } from "ethers/lib/utils";
import { ECDSAOwnershipValidationModule, DEFAULT_ECDSA_OWNERSHIP_MODULE, SessionKeyManagerModule, DEFAULT_SESSION_KEY_MANAGER_MODULE } from "@biconomy/modules";
import { config } from "dotenv"
import { IBundler, Bundler } from '@biconomy/bundler'
import { BiconomySmartAccountV2, DEFAULT_ENTRYPOINT_ADDRESS } from "@biconomy/account"
import { Wallet, providers, ethers } from 'ethers'
import { ChainId } from "@biconomy/core-types"
import
	{
		IPaymaster,
		BiconomyPaymaster,
		PaymasterMode,
	} from '@biconomy/paymaster'
import { SessionFileStorage } from "./customSession";

let smartAccount: BiconomySmartAccountV2
let address: string

config();

const bundler: IBundler = new Bundler( {
	bundlerUrl:
		"https://bundler.biconomy.io/api/v2/80001/nJPK7B3ru.dd7f7861-190d-41bd-af80-6877f74b8f44",
	chainId: ChainId.POLYGON_MUMBAI,
	entryPointAddress: DEFAULT_ENTRYPOINT_ADDRESS,
} );

console.log( { ep: DEFAULT_ENTRYPOINT_ADDRESS } );

const paymaster: IPaymaster = new BiconomyPaymaster( {
	paymasterUrl:
		"https://paymaster.biconomy.io/api/v1/80001/HvwSf9p7Q.a898f606-37ed-48d7-b79a-cbe9b228ce43",
} );

const provider = new providers.JsonRpcProvider(
	"https://rpc.ankr.com/polygon_mumbai"
);
const wallet = new Wallet( process.env.PRIVATE_KEY || "", provider );

async function createAccount ()
{
	const module = await ECDSAOwnershipValidationModule.create( {
		signer: wallet,
		moduleAddress: DEFAULT_ECDSA_OWNERSHIP_MODULE
	} )
	let biconomySmartAccount = await BiconomySmartAccountV2.create( {
		chainId: ChainId.POLYGON_MUMBAI,
		bundler: bundler,
		paymaster: paymaster,
		entryPointAddress: DEFAULT_ENTRYPOINT_ADDRESS,
		defaultValidationModule: module,
		activeValidationModule: module
	} )
	address = await biconomySmartAccount.getAccountAddress()
	console.log( address )
	smartAccount = biconomySmartAccount;

	return biconomySmartAccount;
}


const createSession = async () =>
{
	await createAccount();
	try
	{
		const erc20ModuleAddr = "0x000000D50C68705bd6897B2d17c7de32FB519fDA"
		// -----> setMerkle tree tx flow
		// create dapp side session key
		const sessionSigner = ethers.Wallet.createRandom();
		const sessionKeyEOA = await sessionSigner.getAddress();
		console.log( "sessionKeyEOA", sessionKeyEOA );
		const sessionFileStorage: SessionFileStorage = new SessionFileStorage( address )

		// generate sessionModule
		console.log( "Adding session signer", sessionSigner.publicKey, sessionSigner );

		await sessionFileStorage.addSigner( sessionSigner )
		const sessionModule = await SessionKeyManagerModule.create( {
			moduleAddress: DEFAULT_SESSION_KEY_MANAGER_MODULE,
			smartAccountAddress: address,
			sessionStorageClient: sessionFileStorage
		} );

		// cretae session key data
		const sessionKeyData = defaultAbiCoder.encode(
			[ "address", "address", "address", "uint256" ],
			[
				sessionKeyEOA,
				"0xdA5289fCAAF71d52a80A254da614a192b693e977", // erc20 token address
				"0x322Af0da66D00be980C7aa006377FCaaEee3BDFD", // receiver address
				ethers.utils.parseUnits( "50".toString(), 6 ).toHexString(), // 50 usdc amount
			]
		);
		const sessionTxData = await sessionModule.createSessionData( [
			{
				validUntil: 0,
				validAfter: 0,
				sessionValidationModule: erc20ModuleAddr,
				sessionPublicKey: sessionKeyEOA,
				sessionKeyData: sessionKeyData,
			},
		] );

		// tx to set session key
		const setSessiontrx = {
			to: DEFAULT_SESSION_KEY_MANAGER_MODULE, // session manager module address
			data: sessionTxData.data,
		};

		const transactionArray = [];

		
		const isEnabled = await smartAccount.isModuleEnabled( DEFAULT_SESSION_KEY_MANAGER_MODULE )
		if ( !isEnabled )
		{
			const enableModuleTrx = await smartAccount.getEnableModuleData(
				DEFAULT_SESSION_KEY_MANAGER_MODULE
			);
			transactionArray.push( enableModuleTrx );
		}
		
		transactionArray.push( setSessiontrx )
		let partialUserOp = await smartAccount.buildUserOp( transactionArray, {
			paymasterServiceData: {
				mode: PaymasterMode.SPONSORED,
			}
		} );
		console.log( partialUserOp )
		const userOpResponse = await smartAccount.sendUserOp(
			partialUserOp
		);
		console.log( `userOp Hash: ${ userOpResponse.userOpHash }` );
		const transactionDetails = await userOpResponse.wait();
		console.log( "txHash", transactionDetails.receipt.transactionHash );

	} catch ( err: any ) {
		console.error( err )
	}

}

createSession();
