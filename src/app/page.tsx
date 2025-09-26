"use client";

import { getFromLocalStorage, setToLocalStorage } from "@/lib/utils";
import { getFullnodeUrl, SuiClient, type CoinStruct } from "@mysten/sui/client";
import { Ed25519Keypair } from "@mysten/sui/keypairs/ed25519";
import { Transaction } from "@mysten/sui/transactions";
import { useCallback, useEffect, useRef, useState } from "react";

const COINS_REFRESH_INTERVAL_NORMAL = 5000;
const COINS_REFRESH_INTERVAL_FAST = 1000;

const devPrivateKey = process.env.NEXT_PUBLIC_PRIVATE_KEY;
const devPublicKey = process.env.NEXT_PUBLIC_PUBLIC_KEY;
const devTargetAddress = process.env.NEXT_PUBLIC_TARGET_ADDRESS;
const rpcUrl = getFullnodeUrl("testnet");
const client = new SuiClient({ url: rpcUrl });

const DigestArrKey = "digestArr";

export default function Home() {
  const [amount, setAmount] = useState<string>("");
  const [coins, setCoins] = useState<CoinStruct[]>([]);
  const [coinsLoading, setCoinsLoading] = useState<boolean>(false);
  const [digestArr, setDigestArr] = useState<string[]>([]);
  const [txLoading, setTxLoading] = useState<boolean>(false);

  const coinsTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const coinsReqIdRef = useRef(0);

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
      if (!devPrivateKey) {
        alert("Please set NEXT_PUBLIC_PRIVATE_KEY in .env.development");
        return;
      }
      if (!devTargetAddress) {
        alert("Please set NEXT_PUBLIC_TARGET_ADDRESS in .env.development");
        return;
      }
      if (txLoading) {
        alert("Previous transaction is still in progress");
        return;
      }

      setAmount("");
      setTxLoading(true);
      const tx = new Transaction();

      // create a new coin with balance 100, based on the coins used as gas payment
      // you can define any balance here
      const [coin] = tx.splitCoins(tx.gas, [realAmount]);

      // transfer the split coin to a specific address
      tx.transferObjects([coin], devTargetAddress as string);

      const signer = Ed25519Keypair.fromSecretKey(devPrivateKey);

      const res = await client.signAndExecuteTransaction({
        signer,
        transaction: tx,
      });

      const newDigestArr = [...digestArr, res.digest];
      setDigestArr(newDigestArr);
      setToLocalStorage(DigestArrKey, newDigestArr);

      return res.digest;
    } catch (error) {
      console.error("Transfer failed:", error);
      if (error instanceof Error) {
        alert("Transfer failed: " + error.message);
      } else {
        alert("Transfer failed: " + String(error));
      }
    } finally {
      setTxLoading(false);
    }
  }, [amount, coins, digestArr, txLoading]);

  useEffect(() => {
    const clearCoinsTimer = () => {
      if (coinsTimerRef.current) clearTimeout(coinsTimerRef.current);
      coinsTimerRef.current = null;
    };
    const scheduleCoins = (ms: number) => {
      clearCoinsTimer();
      coinsTimerRef.current = setTimeout(fetchCoins, ms);
    };

    const fetchCoins = async () => {
      const myReqId = ++coinsReqIdRef.current;

      try {
        setCoinsLoading(true);

        // get coins owned by an address
        // replace <OWNER_ADDRESS> with actual address in the form of 0x123...
        const res = await client.getCoins({
          owner: devPublicKey as string,
        });

        if (myReqId === coinsReqIdRef.current) {
          // Just ignore pagination for test reason
          setCoins(res.data);
        }

        scheduleCoins(COINS_REFRESH_INTERVAL_NORMAL);
      } catch (error) {
        console.error("Failed to fetch coins:", error);
        setCoins([]);
        scheduleCoins(COINS_REFRESH_INTERVAL_FAST);
      } finally {
        setCoinsLoading(false);
      }
    };

    if (typeof devPublicKey === "string") {
      fetchCoins();
    } else {
      alert("Please set NEXT_PUBLIC_PUBLIC_KEY in .env.development");
    }

    return () => {
      clearCoinsTimer();
    };
  }, []);

  return (
    <div
      style={{
        padding: 16,
      }}
    >
      <h2>Sui Wallet App</h2>

      <div style={{ marginBottom: 16 }}>
        <h3>Test</h3>
        <ul>
          <li>
            Private Key: {devPrivateKey ? devPrivateKey : "Not Available"}
          </li>
          <li>Public Key: {devPublicKey ? devPublicKey : "Not Available"}</li>
        </ul>

        {/* Show coins here */}
        <div style={{ marginTop: 16, marginBottom: 16 }}>
          <h4>Coins ({coins.length})</h4>
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
        >
          Native Transfer {txLoading ? "..." : ""}
        </button>
      </div>

      <div>
        <input
          onChange={(e) => setAmount(e.target.value)}
          value={amount}
          placeholder="Please input"
          style={{ marginBottom: 8, width: "100%", padding: 4 }}
        />
        <p>To transfer amount: {amount}</p>
      </div>

      {/* Show digestArr */}
      <div>
        <h4>DigestArr</h4>
        <ul>
          {digestArr.map((digest, index) => (
            <li key={index}>{digest}</li>
          ))}
        </ul>
      </div>
    </div>
  );
}
