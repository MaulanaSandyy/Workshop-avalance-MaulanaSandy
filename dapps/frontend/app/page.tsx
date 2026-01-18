"use client";

import { useEffect, useState } from "react";
import {
  useAccount,
  useConnect,
  useDisconnect,
  useWriteContract,
} from "wagmi";
import { injected } from "wagmi/connectors";
import { waitForTransactionReceipt } from "wagmi/actions";
import { useConfig } from "wagmi";
import { Toaster, toast } from "sonner";

// ==============================
// ENV
// ==============================
const CONTRACT_ADDRESS =
  process.env.NEXT_PUBLIC_CONTRACT_ADDRESS as `0x${string}`;
const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL;

// ==============================
// ABI (PUBLIC ONLY)
// ==============================
const SIMPLE_STORAGE_ABI = [
  {
    inputs: [],
    name: "getValue",
    outputs: [{ type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ internalType: "uint256", name: "_value", type: "uint256" }],
    name: "setValue",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
] as const;

export default function Page() {
  const config = useConfig();

  // ==============================
  // WALLET
  // ==============================
  const { address, isConnected, chainId } = useAccount();
  const { connect } = useConnect();
  const { disconnect } = useDisconnect();
  const { writeContract } = useWriteContract();

  const TARGET_CHAIN_ID = 43113;
  const isWrongNetwork = isConnected && chainId !== TARGET_CHAIN_ID;

  // ==============================
  // STATE
  // ==============================
  const [value, setValue] = useState("0");
  const [inputValue, setInputValue] = useState("");
  const [isFetching, setIsFetching] = useState(false);
  const [isWriting, setIsWriting] = useState(false);

  // ==============================
  // READ (BACKEND)
  // ==============================
  const fetchValue = async () => {
    try {
      setIsFetching(true);
      const res = await fetch(`${BACKEND_URL}/blockchain/value`);
      if (!res.ok) throw new Error();
      const json = await res.json();
      setValue(json.data.value);
    } catch {
      toast.error("Gagal mengambil data dari backend");
    } finally {
      setIsFetching(false);
    }
  };

  useEffect(() => {
    fetchValue();
  }, []);

  // ==============================
  // WRITE
  // ==============================
  const handleSetValue = async () => {
    if (!isConnected) return toast.warning("Connect wallet dulu");
    if (isWrongNetwork) return toast.error("Gunakan Avalanche Fuji");

    const parsed = Number(inputValue);
    if (!Number.isInteger(parsed) || parsed < 0) {
      return toast.error("Masukkan angka bulat ≥ 0");
    }

    setIsWriting(true);
    const toastId = toast.loading("Mengirim transaksi...");

    writeContract(
      {
        address: CONTRACT_ADDRESS,
        abi: SIMPLE_STORAGE_ABI,
        functionName: "setValue",
        args: [BigInt(parsed)],
      },
      {
        onSuccess: async (hash) => {
          toast.loading("Menunggu konfirmasi blockchain...", { id: toastId });
          await waitForTransactionReceipt(config, { hash });
          toast.success("Value berhasil diupdate!", { id: toastId });
          setInputValue("");
          fetchValue();
          setIsWriting(false);
        },
        onError: (error) => {
          console.error(error);
          const msg =
            error instanceof Error ? error.message : "Transaksi gagal";
          toast.error(msg, { id: toastId });
          setIsWriting(false);
        },
      }
    );
  };

  // ==============================
  // UI
  // ==============================
  return (
    <main className="min-h-screen bg-gradient-to-br from-[#0f172a] via-black to-[#020617] text-white flex items-center justify-center px-6">
      <Toaster position="bottom-right" richColors />

      <div className="w-full max-w-xl rounded-3xl border border-white/10 bg-white/5 backdrop-blur-xl shadow-2xl p-8 animate-fade-in">
        {/* HEADER */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">
              Avalanche dApp
            </h1>
            <p className="text-sm text-white/60">
              Day 5 Full Stack Demo
            </p>
          </div>

          {!isConnected ? (
            <button
              onClick={() => connect({ connector: injected() })}
              className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 transition-all active:scale-95"
            >
              Connect Wallet
            </button>
          ) : (
            <div className="text-right">
              <p className="text-sm font-mono">
                {address?.slice(0, 6)}...{address?.slice(-4)}
              </p>
              <button
                onClick={() => disconnect()}
                className="text-xs text-red-400 hover:underline"
              >
                Disconnect
              </button>
              <p
                className={`text-xs mt-1 ${
                  isWrongNetwork ? "text-red-400" : "text-emerald-400"
                }`}
              >
                ● {isWrongNetwork ? "Wrong Network" : "Avalanche Fuji"}
              </p>
            </div>
          )}
        </div>

        {/* VALUE CARD */}
        <div className="mb-8 rounded-2xl bg-black/40 border border-white/10 p-6 text-center">
          <p className="text-sm text-white/60 mb-2">
            Current Stored Value
          </p>
          <div className="text-5xl font-extrabold tracking-tight">
            {isFetching ? (
              <span className="animate-pulse text-white/40">•••</span>
            ) : (
              <span className="animate-scale-in">{value}</span>
            )}
          </div>
        </div>

        {/* INPUT */}
        <div className="space-y-4">
          <input
            type="number"
            placeholder="Masukkan nilai baru"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            className="w-full rounded-xl bg-black/50 border border-white/10 px-4 py-3 text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
          />

          <button
            onClick={handleSetValue}
            disabled={isWriting}
            className="w-full py-3 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 transition-all font-semibold disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.98]"
          >
            {isWriting ? "Processing..." : "Update Value"}
          </button>
        </div>

        {/* FOOTER */}
        <p className="text-center text-xs text-white/40 mt-8">
          © 2026 • Maulana Sandy | 221011400282 Avalanche Fuji • Full Stack dApp 
        </p>
      </div>

      {/* ANIMATIONS */}
      <style jsx global>{`
        @keyframes fade-in {
          from {
            opacity: 0;
            transform: translateY(12px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .animate-fade-in {
          animation: fade-in 0.6s ease-out;
        }

        @keyframes scale-in {
          from {
            transform: scale(0.9);
            opacity: 0;
          }
          to {
            transform: scale(1);
            opacity: 1;
          }
        }
        .animate-scale-in {
          animation: scale-in 0.3s ease-out;
        }
      `}</style>
    </main>
  );
}
