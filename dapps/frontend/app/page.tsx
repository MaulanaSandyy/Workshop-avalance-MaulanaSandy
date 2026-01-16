"use client";

import {
  useAccount,
  useConnect,
  useDisconnect,
  useReadContract,
  useWriteContract,
} from "wagmi";
import { injected } from "wagmi/connectors";
import { Toaster, toast } from "sonner";
import { BaseError } from "viem";
import { useState } from "react";
import { waitForTransactionReceipt } from "wagmi/actions";
import { useConfig } from "wagmi";

// ==============================
// CONFIG
// ==============================
const CONTRACT_ADDRESS = "0x5f78729be75f6f9304b185c9d11ec64cba3dce4f";

const SIMPLE_STORAGE_ABI = [
  {
    inputs: [],
    name: "getValue",
    outputs: [{ type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "message",
    outputs: [{ type: "string" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ name: "_value", type: "uint256" }],
    name: "setValue",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [{ name: "_message", type: "string" }],
    name: "setMessage",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
] as const;

export default function Page() {
  const config = useConfig();
  const { address, isConnected, chainId } = useAccount();
  const { connect, isPending: isConnecting } = useConnect();
  const { disconnect } = useDisconnect();

  const TARGET_CHAIN_ID = 43113;
  const isWrongNetwork = isConnected && chainId !== TARGET_CHAIN_ID;

  const [inputValue, setInputValue] = useState("");
  const [inputMessage, setInputMessage] = useState("");
  const [pendingType, setPendingType] = useState<"value" | "message" | null>(null);

  const { data: value, refetch: refetchValue, isFetching: isFetchingValue } = useReadContract({
    address: CONTRACT_ADDRESS,
    abi: SIMPLE_STORAGE_ABI,
    functionName: "getValue",
  });

  const { data: message, refetch: refetchMessage, isFetching: isFetchingMessage } = useReadContract({
    address: CONTRACT_ADDRESS,
    abi: SIMPLE_STORAGE_ABI,
    functionName: "message",
  });

  const { writeContract, isPending: isWriting } = useWriteContract();

  const handleAction = async (type: "value" | "message") => {
    if (!isConnected) return toast.warning("Please connect your wallet");
    if (isWrongNetwork) return toast.error("Please switch to Avalanche Fuji");

    const isVal = type === "value";
    const val = isVal ? inputValue : inputMessage;
    if (!val) return;

    setPendingType(type);
    const toastId = toast.loading(`Processing ${type}...`);

    writeContract(
      {
        address: CONTRACT_ADDRESS,
        abi: SIMPLE_STORAGE_ABI,
        functionName: isVal ? "setValue" : "setMessage",
        args: isVal ? [BigInt(val)] : [val],
      },
      {
        onSuccess: async (hash) => {
          toast.loading("Confirming on-chain...", { id: toastId });
          await waitForTransactionReceipt(config, { hash });
          toast.success(`${type === "value" ? "Value" : "Message"} updated!`, { id: toastId });
          isVal ? refetchValue() : refetchMessage();
          isVal ? setInputValue("") : setInputMessage("");
        },
        onError(error) {
          toast.error("Transaction failed", { id: toastId });
        },
        onSettled: () => setPendingType(null),
      }
    );
  };

  return (
    <main className="min-h-screen bg-[#09090b] text-zinc-100 selection:bg-indigo-500/30 font-sans">
      <Toaster position="bottom-right" richColors />
      
      {/* Background Ornament */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-[25%] -left-[10%] w-[50%] h-[50%] bg-indigo-500/10 blur-[120px] rounded-full" />
        <div className="absolute -bottom-[25%] -right-[10%] w-[50%] h-[50%] bg-emerald-500/10 blur-[120px] rounded-full" />
      </div>

      <div className="relative max-w-5xl mx-auto px-6 py-12 lg:py-20">
        {/* Header Section */}
        <header className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-xs font-medium uppercase tracking-wider">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-indigo-500"></span>
              </span>
              Web3 Storage Protocol
            </div>
            <h1 className="text-4xl md:text-5xl font-bold tracking-tight bg-gradient-to-b from-white to-zinc-500 bg-clip-text text-transparent">
              Avalanche Portal
            </h1>
          </div>

          <div className="flex items-center gap-3">
            {!isConnected ? (
              <button
                onClick={() => connect({ connector: injected() })}
                disabled={isConnecting}
                className="group relative px-6 py-3 rounded-xl bg-white text-black font-semibold transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50"
              >
                {isConnecting ? "Establishing Connection..." : "Connect Wallet"}
              </button>
            ) : (
              <div className="flex flex-col items-end">
                <div className="flex items-center gap-3 p-1.5 pr-4 rounded-full bg-zinc-900 border border-zinc-800">
                   <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-indigo-500 to-emerald-500 shrink-0" />
                   <div className="text-sm font-medium">{address?.slice(0,6)}...{address?.slice(-4)}</div>
                   <button onClick={() => disconnect()} className="text-[10px] uppercase font-bold text-zinc-500 hover:text-red-400 transition-colors">Disconnect</button>
                </div>
                <p className={`text-[10px] mt-1 font-medium tracking-widest uppercase ${isWrongNetwork ? 'text-red-400' : 'text-emerald-500'}`}>
                  ● {isWrongNetwork ? 'Wrong Network' : 'Avalanche Fuji'}
                </p>
              </div>
            )}
          </div>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Data Display Cards */}
          <div className="lg:col-span-1 space-y-6">
            <div className="p-6 rounded-2xl bg-zinc-900/50 border border-zinc-800 backdrop-blur-sm shadow-sm group hover:border-indigo-500/30 transition-colors">
              <p className="text-zinc-500 text-xs font-bold uppercase tracking-widest mb-4">Current Value</p>
              <div className="flex items-baseline gap-2">
                {isFetchingValue ? (
                  <div className="h-10 w-24 bg-zinc-800 animate-pulse rounded-lg" />
                ) : (
                  <span className="text-5xl font-bold tracking-tighter text-white">
                    {value?.toString() || "0"}
                  </span>
                )}
                <span className="text-zinc-500 text-sm font-medium italic">Units</span>
              </div>
            </div>

            <div className="p-6 rounded-2xl bg-zinc-900/50 border border-zinc-800 backdrop-blur-sm shadow-sm group hover:border-emerald-500/30 transition-colors">
              <p className="text-zinc-500 text-xs font-bold uppercase tracking-widest mb-4">Stored Message</p>
              {isFetchingMessage ? (
                <div className="space-y-2">
                  <div className="h-4 w-full bg-zinc-800 animate-pulse rounded" />
                  <div className="h-4 w-2/3 bg-zinc-800 animate-pulse rounded" />
                </div>
              ) : (
                <p className="text-lg font-medium text-zinc-200 leading-relaxed italic">
                  "{message || "No message stored"}"
                </p>
              )}
            </div>
          </div>

          {/* Interaction Card */}
          <div className="lg:col-span-2 p-8 rounded-3xl bg-zinc-900/40 border border-zinc-800/50 backdrop-blur-md">
            <h3 className="text-xl font-semibold mb-8 flex items-center gap-2">
              <span className="w-1.5 h-6 bg-indigo-500 rounded-full" />
              Contract Interactions
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
              <div className="space-y-4">
                <label className="block text-sm font-medium text-zinc-400">Update Numeric Value</label>
                <input
                  type="number"
                  placeholder="0"
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  className="w-full bg-zinc-950/50 border border-zinc-800 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-indigo-500/40 transition-all text-white"
                />
                <button
                  onClick={() => handleAction("value")}
                  disabled={isWriting && pendingType === "value"}
                  className="w-full py-3 rounded-xl bg-zinc-100 text-black font-bold text-sm hover:bg-white transition-colors disabled:opacity-50"
                >
                  {pendingType === "value" ? "Transacting..." : "Update Value"}
                </button>
              </div>

              <div className="space-y-4">
                <label className="block text-sm font-medium text-zinc-400">Update String Message</label>
                <input
                  type="text"
                  placeholder="Type message..."
                  value={inputMessage}
                  onChange={(e) => setInputMessage(e.target.value)}
                  className="w-full bg-zinc-950/50 border border-zinc-800 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-emerald-500/40 transition-all text-white"
                />
                <button
                  onClick={() => handleAction("message")}
                  disabled={isWriting && pendingType === "message"}
                  className="w-full py-3 rounded-xl bg-emerald-600 text-white font-bold text-sm hover:bg-emerald-500 transition-colors shadow-lg shadow-emerald-900/20 disabled:opacity-50"
                >
                  {pendingType === "message" ? "Transacting..." : "Update Message"}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <footer className="mt-20 pt-8 border-t border-zinc-900 flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-[11px] font-medium text-zinc-600 uppercase tracking-[0.2em]">
            &copy; 2026 Author Maulana Sandy — NIM: 221011400282
          </p>
          <div className="flex gap-6">
             <span className="text-[10px] text-zinc-700 font-bold uppercase hover:text-indigo-400 cursor-pointer transition-colors">Documentation</span>
             <span className="text-[10px] text-zinc-700 font-bold uppercase hover:text-indigo-400 cursor-pointer transition-colors">Smart Contract</span>
          </div>
        </footer>
      </div>
    </main>
  );
}