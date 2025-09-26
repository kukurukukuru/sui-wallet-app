"use client";

import { getFromLocalStorage, setToLocalStorage } from "@/lib/utils";
import { getFullnodeUrl, SuiClient, type CoinStruct } from "@mysten/sui/client";
import { Ed25519Keypair } from "@mysten/sui/keypairs/ed25519";
import { Transaction } from "@mysten/sui/transactions";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  ConnectButton,
  useAutoConnectWallet,
  useCurrentAccount,
  useCurrentWallet,
  useSignAndExecuteTransaction,
  useSuiClientQuery,
} from "@mysten/dapp-kit";
import { isValidSuiAddress } from "@mysten/sui/utils";

// const COINS_REFRESH_INTERVAL_NORMAL = 5000;
// const COINS_REFRESH_INTERVAL_FAST = 1000;

// const rpcUrl = getFullnodeUrl("testnet");
// const client = new SuiClient({ url: rpcUrl });

const DigestArrKey = "digestArr";

export default function Home() {
  const account = useCurrentAccount();
  const accountAddress = account?.address;

  const wallet = useCurrentWallet();
  const currentWallet = wallet.currentWallet;
  const autoConnectionStatus = useAutoConnectWallet();
  const { mutate: signAndExecuteTransaction } = useSignAndExecuteTransaction();

  const [amount, setAmount] = useState<string>("");
  const [targetAddress, setTargetAddress] = useState<string>(
    process.env.NEXT_PUBLIC_DEFAULT_TARGET_ADDRESS || ""
  );
  // const [coins, setCoins] = useState<CoinStruct[]>([]);
  // const [coinsLoading, setCoinsLoading] = useState<boolean>(false);
  const [digestArr, setDigestArr] = useState<string[]>([]);
  const [txLoading, setTxLoading] = useState<boolean>(false);

  const { data, isPending: coinsLoading } = useSuiClientQuery(
    "getCoins",
    accountAddress
      ? { owner: accountAddress, limit: 200 }
      : { owner: "", limit: 200 },
    {
      enabled: !!accountAddress,
      refetchInterval: 10000,
      staleTime: 5000,
      gcTime: 60000,
    }
  );
  const coins: CoinStruct[] = data?.data || [];

  // const coinsTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // const coinsReqIdRef = useRef(0);

  useEffect(() => {
    setDigestArr(getFromLocalStorage<string[]>(DigestArrKey) || []);
  }, []);

  const handleNativeTransfer = useCallback(async () => {
    try {
      if (!coins[0]) {
        alert("No coins found");
        return;
      }
      if (!amount) {
        alert("Please input an amount");
        return;
      }
      const realAmount = BigInt(amount);
      if (realAmount <= 0) {
        alert("Please input a positive amount");
        return;
      }
      if (realAmount > BigInt(coins[0].balance)) {
        alert(
          "Insufficient balance, you have " + coins[0].balance + " SUI in Mist"
        );
        return;
      }
      if (!isValidSuiAddress(targetAddress)) {
        alert("Please input a valid target address");
        return;
      }
      if (txLoading) {
        alert("Previous transaction is still in progress");
        return;
      }

      setAmount("");
      setTxLoading(true);
      const transaction = new Transaction();

      // create a new coin with balance 100, based on the coins used as gas payment
      // you can define any balance here
      const [coin] = transaction.splitCoins(transaction.gas, [realAmount]);

      // transfer the split coin to a specific address
      transaction.transferObjects([coin], targetAddress);

      signAndExecuteTransaction(
        {
          transaction,
          chain: "sui:testnet",
        },
        {
          onSuccess: (result) => {
            console.log("executed transaction", result);
            setDigestArr((prev) => {
              const newArr = [result.digest, ...prev];
              setToLocalStorage(DigestArrKey, newArr);
              return newArr;
            });
            setTxLoading(false);
          },
          onError: (error) => {
            console.error("Transfer failed:", error);
            if (error instanceof Error) {
              alert("Transfer failed: " + error.message);
            } else {
              alert("Transfer failed: " + String(error));
            }
            setTxLoading(false);
          },
          onSettled: () => {
            setTxLoading(false);
          },
        }
      );
    } catch (error) {
      console.error("Transfer failed:", error);
      if (error instanceof Error) {
        alert("Transfer failed: " + error.message);
      } else {
        alert("Transfer failed: " + String(error));
      }
    }
  }, [amount, coins, digestArr, txLoading, signAndExecuteTransaction]);

  // useEffect(() => {
  //   const clearCoinsTimer = () => {
  //     if (coinsTimerRef.current) clearTimeout(coinsTimerRef.current);
  //     coinsTimerRef.current = null;
  //   };
  //   const scheduleCoins = (ms: number) => {
  //     clearCoinsTimer();
  //     coinsTimerRef.current = setTimeout(() => {
  //       if (typeof accountAddress === "string") {
  //         fetchCoins(accountAddress);
  //       }
  //     }, ms);
  //   };

  //   const fetchCoins = async (address: string) => {
  //     const myReqId = ++coinsReqIdRef.current;

  //     try {
  //       setCoinsLoading(true);

  //       // get coins owned by an address
  //       // replace <OWNER_ADDRESS> with actual address in the form of 0x123...
  //       const res = await client.getCoins({
  //         owner: address,
  //       });

  //       if (myReqId === coinsReqIdRef.current) {
  //         // Just ignore pagination for test reason
  //         setCoins(res.data);
  //       }

  //       scheduleCoins(COINS_REFRESH_INTERVAL_NORMAL);
  //     } catch (error) {
  //       console.error("Failed to fetch coins:", error);
  //       setCoins([]);
  //       scheduleCoins(COINS_REFRESH_INTERVAL_FAST);
  //     } finally {
  //       setCoinsLoading(false);
  //     }
  //   };

  //   if (typeof accountAddress === "string") {
  //     fetchCoins(accountAddress);
  //   }

  //   return () => {
  //     clearCoinsTimer();
  //   };
  // }, [accountAddress]);

  return (
    <div
      style={{
        padding: 16,
      }}
    >
      <h2>Alex SUI Dapp</h2>

      <ConnectButton />
      <div>Auto-connection status: {autoConnectionStatus}</div>

      <div style={{ marginBottom: 16 }}>
        {currentWallet && (
          <>
            <h3>Wallet</h3>
            <ul>
              <li>Name: {currentWallet?.name}</li>
            </ul>
          </>
        )}

        {account && (
          <>
            <h3>Account</h3>
            <ul>
              <li>Address: {account.address}</li>
              <li>Public Key: {account?.publicKey}</li>
            </ul>
          </>
        )}

        {/* Show coins here */}
        <div style={{ marginTop: 16, marginBottom: 16 }}>
          <h3>Coins ({coins.length})</h3>
          {coins.length > 0 ? (
            <ul style={{ listStyle: "none", padding: 0 }}>
              {coins.map((coin, index) => (
                <li
                  key={index}
                  style={{
                    padding: "8px",
                    border: "1px solid #ddd",
                    marginBottom: "4px",
                    borderRadius: "4px",
                  }}
                >
                  <div>Type: {coin.coinType}</div>
                  <div>Balance SUI in Mist: {coin.balance}</div>
                </li>
              ))}
            </ul>
          ) : coinsLoading ? (
            <p>Loading...</p>
          ) : (
            <p>No coins found</p>
          )}
        </div>

        <h3>Send Native</h3>

        <div>
          <input
            onChange={(e) => setAmount(e.target.value)}
            value={amount}
            placeholder="Input amount to send"
            style={{ marginBottom: 8, width: "100%", padding: 4 }}
          />
          <input
            onChange={(e) => setTargetAddress(e.target.value)}
            value={targetAddress}
            placeholder="Input target address"
            style={{ marginBottom: 8, width: "100%", padding: 4 }}
          />
        </div>

        <button
          onClick={handleNativeTransfer}
          style={{
            padding: "8px 16px",
            backgroundColor: "blue",
            color: "white",
            border: "none",
            borderRadius: "4px",
            cursor: "pointer",
          }}
          disabled={txLoading}
        >
          Sign and execute transaction {txLoading ? "..." : ""}
        </button>
      </div>

      {/* Show digestArr */}
      <div>
        <h3>Local Digest List (Sorted by newest)</h3>
        <ul>
          {digestArr.map((digest, index) => (
            <li key={index}>{digest}</li>
          ))}
        </ul>
      </div>
    </div>
  );
}
