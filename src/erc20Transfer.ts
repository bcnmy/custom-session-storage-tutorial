import usdcAbi from "./usdcabi.json"
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
} from '@biconomy/paymaster'

import { SessionFileStorage } from "./customSession";
config()

let smartAccount: BiconomySmartAccountV2
let address: string
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

const erc20Transfer = async ( sessionFileStorage: SessionFileStorage, amount: string ) =>
{

	if ( !address || !smartAccount )
	{
		console.log( "Please connect wallet first" );
		return;
	}
	try
	{

		const erc20ModuleAddr = "0x000000D50C68705bd6897B2d17c7de32FB519fDA";
		// get session key from file storage
		const sessionKeyPrivKey = await sessionFileStorage.getSignerBySession( {} );
		console.log( "sessionKeyPrivKey", sessionKeyPrivKey );
		if ( !sessionKeyPrivKey )
		{
			console.log( "Session key not found please create session" );
			return;
		}
		//@ts-ignore
		const sessionSigner = new ethers.Wallet( sessionKeyPrivKey );
		console.log( "sessionSigner", sessionSigner );
		console.log( "created -1" )
		// generate sessionModule
		const sessionModule = await SessionKeyManagerModule.create( {
			moduleAddress: DEFAULT_SESSION_KEY_MANAGER_MODULE,
			smartAccountAddress: address,
			sessionStorageClient: sessionFileStorage
		} );
		console.log( "created 0" )
		// set active module to sessionModule
		smartAccount = smartAccount.setActiveValidationModule( sessionModule );

		const tokenContract = new ethers.Contract(
			// polygon mumbai usdc address
			"0xdA5289fCAAF71d52a80A254da614a192b693e977",
			usdcAbi,
			provider
		);
		let decimals = 18;

		try
		{
			decimals = await tokenContract.decimals();
		} catch ( error )
		{
			throw new Error( "invalid token address supplied" );
		}
		console.log( "created 1 decimals", decimals )
		const { data } = await tokenContract.populateTransaction.transfer(
			"0x322Af0da66D00be980C7aa006377FCaaEee3BDFD", // receiver address
			ethers.utils.parseUnits( amount, decimals )
		);

		console.log( "created 2" )
		// generate tx data to erc20 transfer
		const tx1 = {
			to: "0xdA5289fCAAF71d52a80A254da614a192b693e977", //erc20 token address
			data: data,
			value: "0",
		};

		// build user op
		// const ifModuleEnabled = await smartAccount.isModuleEnabled("")
		let userOp = await smartAccount.buildUserOp( [ tx1 ], {
			overrides: {
				// signature: "0x0000000000000000000000000000000000000000000000000000000000000040000000000000000000000000000000456b395c4e107e0302553b90d1ef4a32e9000000000000000000000000000000000000000000000000000000000000020000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000db3d753a1da5a6074a9f74f39a0a779d3300000000000000000000000000000000000000000000000000000000000000c0000000000000000000000000000000000000000000000000000000000000016000000000000000000000000000000000000000000000000000000000000001800000000000000000000000000000000000000000000000000000000000000080000000000000000000000000bfe121a6dcf92c49f6c2ebd4f306ba0ba0ab6f1c000000000000000000000000da5289fcaaf71d52a80a254da614a192b693e97700000000000000000000000042138576848e839827585a3539305774d36b96020000000000000000000000000000000000000000000000000000000002faf08000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000041feefc797ef9e9d8a6a41266a85ddf5f85c8f2a3d2654b10b415d348b150dabe82d34002240162ed7f6b7ffbc40162b10e62c3e35175975e43659654697caebfe1c00000000000000000000000000000000000000000000000000000000000000"
				// callGasLimit: 2000000, // only if undeployed account
				// verificationGasLimit: 700000
			},
			skipBundlerGasEstimation: false,
			params: {
				sessionSigner: sessionSigner,
				sessionValidationModule: erc20ModuleAddr,
			},
		} );
		console.log( "created 3" )
		// send user op
		const userOpResponse = await smartAccount.sendUserOp( userOp, {
			sessionSigner: sessionSigner,
			sessionValidationModule: erc20ModuleAddr,
		} );
		console.log( "created 4" )
		console.log( "userOpHash", userOpResponse );
		const { receipt } = await userOpResponse.wait( 1 );
		console.log( "txHash", receipt.transactionHash );
		const polygonScanlink = `https://mumbai.polygonscan.com/tx/${ receipt.transactionHash }`

	} catch ( err: any )
	{
		console.error( err );
	}
}


async function executeTransaction ()
{
	await createAccount();
	const sessionFileStorage: SessionFileStorage = new SessionFileStorage( address )
	await erc20Transfer( sessionFileStorage, "0.019" )
	await erc20Transfer( sessionFileStorage, "0.018" )
}

executeTransaction();
