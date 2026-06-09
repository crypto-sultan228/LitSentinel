import React, { useState, useEffect, useCallback, useRef } from 'react';
import { ethers } from 'ethers';
import {
  Shield, Zap, Heart, AlertTriangle, CheckCircle, XCircle,
  Copy, Sun, Moon, Wifi, WifiOff, TrendingUp, TrendingDown,
  Activity, Clock, Flame, Lock, X, Award, Share2, FileCode,
} from 'lucide-react';

// ─── Constants ───────────────────────────────────────────────────────────────
const LITVM_CHAIN_ID   = 4441;
const LITVM_RPC        = 'https://rpc.litvm.org';
const CHARITY_ADDRESS  = '0x04733b7D5E8a457B85c2e5178D549BAe2446340a';
const CONTRACT_ADDRESS = '0xa1b29221Befc6820EC648B697d765a0F0689201e';
const GAS_BUFFER       = 1.3;
const FOOTPRINT_LABEL  = 'LitSentinel_Optimized_By_Sultan';
const MIN_DONATION     = 0.000001; // minimum zkLTC donation

// ─── Helpers ─────────────────────────────────────────────────────────────────
const truncateAddress  = (a) => a ? `${a.slice(0,6)}...${a.slice(-4)}` : '';
const copyToClipboard  = async (t) => { try { await navigator.clipboard.writeText(t); return true; } catch { return false; } };
const formatBalance    = (v, d = 4) => { const n = parseFloat(v); return isNaN(n) ? '0.0000' : n.toFixed(d); };
const applyGasBuffer   = (v) => typeof v === 'bigint' ? (v * 130n) / 100n : Math.ceil(Number(v) * GAS_BUFFER);

const safeHexToInt = (hex) => {
  if (!hex || typeof hex !== 'string') return null;
  const n = parseInt(hex, 16);
  return isNaN(n) || n < 0 ? null : n;
};

const safeHexToGwei = (hex) => {
  if (!hex || typeof hex !== 'string') return null;
  try {
    const bigVal = BigInt(hex);
    if (bigVal < 0n) return null;
    const gwei = parseFloat(ethers.formatUnits(bigVal, 'gwei'));
    return isNaN(gwei) || gwei < 0 ? null : Math.max(0, gwei).toFixed(3);
  } catch { return null; }
};

const rpcCall = async (method, params = []) => {
  const res  = await fetch(LITVM_RPC, {
    method : 'POST',
    headers: { 'Content-Type': 'application/json' },
    body   : JSON.stringify({ jsonrpc: '2.0', method, params, id: 1 }),
  });
  const json = await res.json();
  if (json.error) throw new Error(json.error.message);
  return json.result;
};

// ─── X Logo ──────────────────────────────────────────────────────────────────
const XLogo = ({ className = 'w-4 h-4' }) => (
  <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.744l7.737-8.835L1.254 2.25H8.08l4.255 5.623L18.244 2.25zm-1.161 17.52h1.833L7.084 4.126H5.117L17.083 19.77z"/>
  </svg>
);

// ─── Reusable Components ──────────────────────────────────────────────────────
const MetricCard = ({ icon: Icon, label, value, subValue, accent = 'indigo', dark, loading }) => {
  const accents = {
    indigo: dark ? 'border-indigo-500/30 bg-indigo-500/5'   : 'border-indigo-200 bg-indigo-50',
    green : dark ? 'border-emerald-500/30 bg-emerald-500/5' : 'border-emerald-200 bg-emerald-50',
    orange: dark ? 'border-orange-500/30 bg-orange-500/5'   : 'border-orange-200 bg-orange-50',
    red   : dark ? 'border-red-500/30 bg-red-500/5'         : 'border-red-200 bg-red-50',
  };
  const iconColors = { indigo:'text-indigo-400', green:'text-emerald-400', orange:'text-orange-400', red:'text-red-400' };
  const skeletonBg = dark ? 'bg-slate-700/60' : 'bg-slate-200';
  return (
    <div className={`rounded-xl border p-4 transition-all duration-200 ${accents[accent]}`}>
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <p className={`text-xs font-semibold uppercase tracking-widest mb-1.5 ${dark ? 'text-slate-400' : 'text-slate-500'}`}>{label}</p>
          {loading
            ? <div className={`h-6 w-28 rounded-md animate-pulse ${skeletonBg}`} />
            : <p className={`text-xl font-bold font-mono truncate ${dark ? 'text-white' : 'text-slate-900'}`}>{value}</p>
          }
          {subValue && <p className={`text-xs mt-1 ${dark ? 'text-slate-500' : 'text-slate-400'}`}>{subValue}</p>}
        </div>
        <Icon className={`w-5 h-5 flex-shrink-0 ml-2 mt-0.5 ${iconColors[accent]}`} />
      </div>
    </div>
  );
};

const SectionCard = ({ children, accent = 'indigo', dark, className = '' }) => {
  const borders = {
    indigo: dark ? 'border-indigo-500/20' : 'border-indigo-200',
    green : dark ? 'border-emerald-500/20' : 'border-emerald-200',
    red   : dark ? 'border-red-500/20'  : 'border-red-200',
    orange: dark ? 'border-orange-500/20' : 'border-orange-200',
    violet: dark ? 'border-violet-500/20' : 'border-violet-200',
  };
  const topBar = {
    indigo: dark ? 'from-indigo-500/20 to-transparent' : 'from-indigo-100 to-transparent',
    green : dark ? 'from-emerald-500/20 to-transparent' : 'from-emerald-100 to-transparent',
    red   : dark ? 'from-red-500/20 to-transparent'  : 'from-red-100 to-transparent',
    orange: dark ? 'from-orange-500/20 to-transparent' : 'from-orange-100 to-transparent',
    violet: dark ? 'from-violet-500/20 to-transparent' : 'from-violet-100 to-transparent',
  };
  return (
    <div className={`rounded-2xl border overflow-hidden shadow-lg ${borders[accent] ?? borders.indigo} ${dark ? 'bg-slate-900/60' : 'bg-white'} ${className}`}>
      <div className={`h-0.5 w-full bg-gradient-to-r ${topBar[accent] ?? topBar.indigo}`} />
      <div className="p-5 sm:p-6">{children}</div>
    </div>
  );
};

const Spinner = ({ size = 'sm', color = 'indigo' }) => {
  const sizes  = { sm:'w-4 h-4', md:'w-5 h-5', lg:'w-6 h-6' };
  const colors = { indigo:'border-indigo-400', green:'border-emerald-400', red:'border-red-400', orange:'border-orange-400' };
  return <div className={`${sizes[size]} border-2 border-transparent ${colors[color]} border-t-current rounded-full animate-spin`} />;
};

const CopyBtn = ({ text, dark }) => {
  const [copied, setCopied] = useState(false);
  const handle = async () => { if (await copyToClipboard(text)) { setCopied(true); setTimeout(() => setCopied(false), 2000); } };
  return (
    <button onClick={handle} title="Copy" className={`p-1.5 rounded-lg transition-all ${dark ? 'hover:bg-slate-700 text-slate-400 hover:text-white' : 'hover:bg-slate-100 text-slate-400 hover:text-slate-700'}`}>
      {copied ? <CheckCircle className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
    </button>
  );
};

// ─── App ─────────────────────────────────────────────────────────────────────
export default function App() {
  const [dark, setDark]                   = useState(true);
  const [bannerVisible, setBannerVisible] = useState(true);

  const [account, setAccount]             = useState(null);
  const [chainId, setChainId]             = useState(null);
  const [balance, setBalance]             = useState('0');
  const [nonce, setNonce]                 = useState(0);
  const [connecting, setConnecting]       = useState(false);
  const [walletError, setWalletError]     = useState('');

  const [blockNumber, setBlockNumber]     = useState(null);
  const [gasPrice, setGasPrice]           = useState(null);
  const [chainLoading, setChainLoading]   = useState(true);

  const [ltcData, setLtcData]             = useState(null);
  const [ltcLoading, setLtcLoading]       = useState(true);

  const [footprintStatus, setFootprintStatus] = useState('idle');
  const [footprintTx, setFootprintTx]         = useState(null);
  const [footprintError, setFootprintError]   = useState('');

  const [donateAmount, setDonateAmount]   = useState('');
  const [donateStatus, setDonateStatus]   = useState('idle');
  const [donateError, setDonateError]     = useState('');
  const [lifetimeDonated, setLifetimeDonated] = useState('0');
  const [donateReceipt, setDonateReceipt] = useState(null);
  const [copiedTx, setCopiedTx]           = useState(false);

  const [evacAddress, setEvacAddress]         = useState('');
  const [evacStatus, setEvacStatus]           = useState('idle');
  const [evacTx, setEvacTx]                   = useState(null);
  const [evacError, setEvacError]             = useState('');
  const [evacAddressValid, setEvacAddressValid] = useState(null);

  const pollingRef = useRef(null);
  const sybilScore = Math.min(100, 40 + nonce * 5 + (parseFloat(balance) > 0.01 ? 20 : 0));

  useEffect(() => { document.documentElement.classList.toggle('dark', dark); }, [dark]);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const [blockHex, gasPriceHex] = await Promise.all([
          rpcCall('eth_blockNumber'),
          rpcCall('eth_gasPrice'),
        ]);
        const block = safeHexToInt(blockHex);
        const gwei  = safeHexToGwei(gasPriceHex);
        if (block !== null) setBlockNumber(block);
        if (gwei  !== null) setGasPrice(gwei);
      } catch { /* RPC unreachable */ } finally { setChainLoading(false); }
    };
    fetchStats();
    pollingRef.current = setInterval(fetchStats, 5000);
    return () => clearInterval(pollingRef.current);
  }, []);

  useEffect(() => {
    const fetchLtc = async () => {
      try {
        setLtcLoading(true);
        const res  = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=litecoin&vs_currencies=usd&include_24hr_change=true&include_market_cap=true');
        const data = await res.json();
        setLtcData(data.litecoin ?? null);
      } catch { setLtcData(null); } finally { setLtcLoading(false); }
    };
    fetchLtc();
    const id = setInterval(fetchLtc, 60_000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    const autoReconnect = async () => {
      if (!window.ethereum) return;
      try {
        const accounts = await window.ethereum.request({ method: 'eth_accounts' });
        if (accounts?.length > 0) {
          const addr = ethers.getAddress(accounts[0]);
          setAccount(addr);
          const cid = await window.ethereum.request({ method: 'eth_chainId' });
          setChainId(parseInt(cid, 16));
          await refreshAccountData(addr);
          loadLifetimeDonated(addr);
        }
      } catch { /* silent */ }
    };
    autoReconnect();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!window.ethereum) return;
    const onAccountsChanged = async (accounts) => {
      if (!accounts.length) { disconnectWallet(); return; }
      const addr = ethers.getAddress(accounts[0]);
      setAccount(addr);
      await refreshAccountData(addr);
      loadLifetimeDonated(addr);
    };
    const onChainChanged = (cid) => setChainId(parseInt(cid, 16));
    window.ethereum.on('accountsChanged', onAccountsChanged);
    window.ethereum.on('chainChanged', onChainChanged);
    return () => {
      window.ethereum.removeListener('accountsChanged', onAccountsChanged);
      window.ethereum.removeListener('chainChanged', onChainChanged);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadLifetimeDonated = (addr) =>
    setLifetimeDonated(localStorage.getItem(`litscan_donated_${addr.toLowerCase()}`) || '0');

  const addToLifetimeDonated = (addr, amount) => {
    const key  = `litscan_donated_${addr.toLowerCase()}`;
    const next = (parseFloat(localStorage.getItem(key) || '0') + parseFloat(amount)).toFixed(6);
    localStorage.setItem(key, next);
    setLifetimeDonated(next);
  };

  const refreshAccountData = useCallback(async (addr) => {
    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      const [raw, cnt] = await Promise.all([provider.getBalance(addr), provider.getTransactionCount(addr)]);
      setBalance(ethers.formatEther(raw));
      setNonce(cnt);
    } catch { /* ignore */ }
  }, []);

  const getBrowserProvider = () => new ethers.BrowserProvider(window.ethereum);

  const connectWallet = async () => {
    if (!window.ethereum) { setWalletError('No Web3 wallet detected. Please install MetaMask.'); return; }
    setConnecting(true); setWalletError('');
    try {
      const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
      const addr = ethers.getAddress(accounts[0]);
      const cid  = await window.ethereum.request({ method: 'eth_chainId' });
      setAccount(addr); setChainId(parseInt(cid, 16));
      await refreshAccountData(addr);
      loadLifetimeDonated(addr);
    } catch (e) { setWalletError(e.message || 'Connection rejected.'); }
    finally { setConnecting(false); }
  };

  const disconnectWallet = () => {
    setAccount(null); setChainId(null); setBalance('0'); setNonce(0);
    setFootprintStatus('idle'); setFootprintTx(null); setFootprintError('');
    setDonateStatus('idle'); setDonateError(''); setDonateReceipt(null);
    setEvacStatus('idle'); setEvacTx(null); setEvacError('');
    setLifetimeDonated('0');
  };

  const switchToLitVM = async () => {
    try {
      await window.ethereum.request({ method: 'wallet_switchEthereumChain', params: [{ chainId: `0x${LITVM_CHAIN_ID.toString(16)}` }] });
    } catch (e) {
      if (e.code === 4902) {
        try {
          await window.ethereum.request({
            method: 'wallet_addEthereumChain',
            params: [{ chainId: `0x${LITVM_CHAIN_ID.toString(16)}`, chainName: 'LitVM Testnet', nativeCurrency: { name: 'zkLTC', symbol: 'zkLTC', decimals: 18 }, rpcUrls: [LITVM_RPC] }],
          });
        } catch { /* ignore */ }
      }
    }
  };

  const getSybilBadge = () => {
    if (sybilScore >= 90) return { label: 'ELITE TRUSTED',      color: 'text-emerald-400', bg: dark ? 'bg-emerald-500/10 border-emerald-500/30' : 'bg-emerald-50 border-emerald-200' };
    if (sybilScore >= 70) return { label: 'VERIFIED AGENT',     color: 'text-blue-400',    bg: dark ? 'bg-blue-500/10 border-blue-500/30'       : 'bg-blue-50 border-blue-200' };
    if (sybilScore >= 50) return { label: 'ACTIVE PARTICIPANT', color: 'text-yellow-400',  bg: dark ? 'bg-yellow-500/10 border-yellow-500/30'   : 'bg-yellow-50 border-yellow-200' };
    return                       { label: 'NEW IDENTITY',       color: 'text-slate-400',   bg: dark ? 'bg-slate-700/30 border-slate-600/30'     : 'bg-slate-100 border-slate-200' };
  };
  const sybilBadge = getSybilBadge();

  const runFootprintOptimizer = async () => {
    if (!account || footprintStatus === 'loading') return;
    setFootprintStatus('loading'); setFootprintError(''); setFootprintTx(null);
    try {
      const provider  = getBrowserProvider();
      const signer    = await provider.getSigner();
      const feeData   = await provider.getFeeData();
      const gasLimit  = applyGasBuffer(21000n);
      const bufferedGasPrice = feeData.gasPrice ? applyGasBuffer(feeData.gasPrice) : undefined;
      const tx = await signer.sendTransaction({ to: account, value: 0n, gasLimit, ...(bufferedGasPrice && { gasPrice: bufferedGasPrice }) });
      setFootprintTx(tx.hash);
      await tx.wait(1);
      setFootprintStatus('success');
      await refreshAccountData(account);
    } catch (e) { setFootprintStatus('error'); setFootprintError(e.reason || e.message || 'Transaction failed.'); }
  };

  // ── Donation — minimum credit: MIN_DONATION (0.000001 zkLTC) ────────────────
  const runDonation = async () => {
    const parsed = parseFloat(donateAmount);
    if (!donateAmount || isNaN(parsed) || parsed < MIN_DONATION) {
      setDonateError(`Enter a valid amount (min ${MIN_DONATION} zkLTC).`);
      return;
    }
    setDonateStatus('loading'); setDonateError(''); setDonateReceipt(null);
    try {
      const provider   = getBrowserProvider();
      const signer     = await provider.getSigner();
      const feeData    = await provider.getFeeData();
      const value      = ethers.parseEther(donateAmount);
      const gasEst     = await provider.estimateGas({ from: account, to: CHARITY_ADDRESS, value });
      const bufferedGas      = applyGasBuffer(gasEst);
      const bufferedGasPrice = feeData.gasPrice ? applyGasBuffer(feeData.gasPrice) : undefined;
      const tx = await signer.sendTransaction({ to: CHARITY_ADDRESS, value, gasLimit: bufferedGas, ...(bufferedGasPrice && { gasPrice: bufferedGasPrice }) });
      await tx.wait(1);
      setDonateStatus('success');
      addToLifetimeDonated(account, donateAmount);
      setDonateReceipt({ donor: account, beneficiary: CHARITY_ADDRESS, value: donateAmount, hash: tx.hash, timestamp: new Date().toLocaleString() });
      await refreshAccountData(account);
      setDonateAmount('');
    } catch (e) { setDonateStatus('error'); setDonateError(e.reason || e.message || 'Donation failed.'); }
  };

  const validateEvacAddress = (val) => {
    setEvacAddress(val);
    setEvacAddressValid(val.length >= 42 ? ethers.isAddress(val) : null);
  };

  const runEvacuation = async () => {
    if (!evacAddressValid) { setEvacError('Invalid destination address.'); return; }
    if (evacAddress.toLowerCase() === account.toLowerCase()) { setEvacError('Destination cannot be the same as source.'); return; }
    setEvacStatus('loading'); setEvacError(''); setEvacTx(null);
    try {
      const provider = getBrowserProvider();
      const signer   = await provider.getSigner();
      const feeData  = await provider.getFeeData();
      const currBal  = await provider.getBalance(account);
      const gasLimit = applyGasBuffer(21000n);
      const gp       = feeData.gasPrice ? applyGasBuffer(feeData.gasPrice) : 0n;
      const gasCost  = BigInt(gasLimit) * gp;
      const maxSend  = currBal - gasCost;
      if (maxSend <= 0n) { setEvacError('Insufficient funds to cover gas cost. Nothing to evacuate.'); setEvacStatus('error'); return; }
      const tx = await signer.sendTransaction({ to: evacAddress, value: maxSend, gasLimit, gasPrice: gp });
      setEvacTx(tx.hash);
      await tx.wait(1);
      setEvacStatus('success');
      await refreshAccountData(account);
    } catch (e) { setEvacStatus('error'); setEvacError(e.reason || e.message || 'Evacuation failed.'); }
  };

  const shareOnX = () => {
    const tweet = encodeURIComponent(`My LitVM Trust Score is ${sybilScore}! Verified & Optimized on LitSentinel Omni-Agent V8. @mahamudsultan21 #LitVMHackathon`);
    window.open(`https://twitter.com/intent/tweet?text=${tweet}`, '_blank', 'noopener');
  };

  const copyTxHash = async (hash) => {
    await copyToClipboard(hash);
    setCopiedTx(true);
    setTimeout(() => setCopiedTx(false), 2000);
  };

  // ── Theme tokens ─────────────────────────────────────────────────────────────
  const bg        = dark ? 'bg-slate-950'     : 'bg-slate-50';
  const textCls   = dark ? 'text-white'       : 'text-slate-900';
  const textMuted = dark ? 'text-slate-400'   : 'text-slate-500';
  const border    = dark ? 'border-slate-800' : 'border-slate-200';
  const inputBase = dark
    ? 'bg-slate-800/80 border-slate-700 text-white placeholder-slate-500 focus:border-indigo-500'
    : 'bg-white border-slate-300 text-slate-900 placeholder-slate-400 focus:border-indigo-400';

  const isOnCorrectChain = chainId === LITVM_CHAIN_ID;
  const skeletonBg = dark ? 'bg-slate-700/60' : 'bg-slate-200';

  return (
    <div className={`min-h-screen ${bg} ${textCls} font-sans transition-colors duration-300`}>

      {/* ── Warning Banner ── */}
      {bannerVisible && (
        <div className="fixed top-0 left-0 right-0 z-50 flex items-center justify-center px-4 py-2.5 bg-gradient-to-r from-amber-600/90 via-orange-500/90 to-amber-600/90 backdrop-blur-md border-b border-amber-500/30 shadow-lg">
          <div className="flex items-center gap-2 text-center">
            <AlertTriangle className="w-4 h-4 text-white flex-shrink-0 animate-pulse" />
            <span className="text-xs sm:text-sm font-semibold text-white tracking-wide">⚠️ TESTNET ENVIRONMENT — Assets have ZERO financial value. Built for educational use.</span>
          </div>
          <button onClick={() => setBannerVisible(false)} className="absolute right-3 p-1 rounded-full text-white/80 hover:text-white hover:bg-white/20 transition-colors"><X className="w-4 h-4" /></button>
        </div>
      )}

      {/* ── Wrong-chain overlay ── */}
      {account && !isOnCorrectChain && (
        <div className="fixed inset-0 z-40 flex items-center justify-center p-4" style={{ backdropFilter: 'blur(12px)', background: 'rgba(7,0,20,0.85)' }}>
          <div className="max-w-md w-full rounded-2xl border border-red-500/40 bg-red-950/40 backdrop-blur-xl p-8 text-center shadow-2xl" style={{ boxShadow: '0 0 60px rgba(239,68,68,0.25)' }}>
            <div className="w-16 h-16 mx-auto mb-5 rounded-full bg-red-500/10 border border-red-500/30 flex items-center justify-center"><XCircle className="w-8 h-8 text-red-400" /></div>
            <h2 className="text-2xl font-black text-red-300 mb-2 tracking-tight">SYSTEM HALT</h2>
            <p className="text-red-400/80 font-semibold mb-1">SWITCH TO LITVM TESTNET (4441)</p>
            <p className="text-slate-400 text-sm mb-6">Current Chain ID: <span className="font-mono text-red-300">{chainId}</span></p>
            <button onClick={switchToLitVM} className="w-full py-3 rounded-xl bg-red-500 hover:bg-red-600 text-white font-bold text-sm tracking-widest transition-all active:scale-95">SWITCH NETWORK NOW</button>
          </div>
        </div>
      )}

      <div className={bannerVisible ? 'pt-12' : 'pt-0'}>

        {/* ── Header ── */}
        <header className={`sticky top-0 z-30 border-b ${border} ${dark ? 'bg-slate-950/90' : 'bg-white/90'} backdrop-blur-xl`}>
          <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="flex items-center gap-2.5 group cursor-pointer select-none bg-transparent border-0 p-0"
              title="Reload LitSentinel"
            >
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg group-hover:shadow-indigo-500/40 transition-all">
                <Shield className="w-4 h-4 text-white" />
              </div>
              <div className="leading-none">
                <span className={`text-base font-black tracking-tight group-hover:text-indigo-400 transition-colors ${textCls}`}>LitSentinel</span>
                <span className={`text-xs font-mono ml-1.5 ${dark ? 'text-slate-500' : 'text-slate-400'}`}>V8</span>
              </div>
            </button>

            <div className="flex items-center gap-2 sm:gap-3">
              <button
                onClick={() => setDark(!dark)}
                className={`p-2 rounded-lg border transition-all ${dark ? 'border-slate-700 bg-slate-800 hover:bg-slate-700 text-slate-300' : 'border-slate-200 bg-slate-100 hover:bg-slate-200 text-slate-600'}`}
                title={dark ? 'Switch to Light mode' : 'Switch to Dark mode'}
              >
                {dark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
              </button>

              {account ? (
                <div className="flex items-center gap-2">
                  <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs font-mono ${dark ? 'bg-slate-800/80 border-slate-700 text-slate-300' : 'bg-slate-100 border-slate-200 text-slate-700'}`}>
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse flex-shrink-0" />
                    <span className="hidden sm:inline">{truncateAddress(account)}</span>
                    <span className="sm:hidden">{account.slice(0,6)}…</span>
                  </div>
                  <button
                    onClick={disconnectWallet}
                    className={`px-3 py-1.5 rounded-lg border text-xs font-semibold transition-all ${dark ? 'border-slate-700 bg-slate-800 hover:bg-red-500/10 hover:border-red-500/40 hover:text-red-400 text-slate-300' : 'border-slate-200 bg-white hover:bg-red-50 hover:border-red-300 hover:text-red-600 text-slate-700'}`}
                  >DISCONNECT</button>
                </div>
              ) : (
                <div className={`flex items-center gap-1.5 text-xs ${textMuted}`}><WifiOff className="w-3.5 h-3.5" /><span className="hidden sm:inline">Not connected</span></div>
              )}
            </div>
          </div>
        </header>

        {/* ── Main ── */}
        <main className="max-w-6xl mx-auto px-4 sm:px-6 py-8 sm:py-10 space-y-8">
          {!account ? (
            <>
              {/* Hero */}
              <div className="text-center pt-6 pb-4 space-y-4">
                <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border text-xs font-semibold tracking-widest uppercase mb-2"
                  style={{ borderColor: dark ? 'rgba(99,102,241,0.3)' : 'rgba(99,102,241,0.25)', color: dark ? '#818cf8' : '#4f46e5', background: dark ? 'rgba(99,102,241,0.08)' : 'rgba(99,102,241,0.06)' }}>
                  <Activity className="w-3 h-3 animate-pulse" /> LitVM Testnet Security Suite
                </div>
                <h1 className={`text-4xl sm:text-5xl lg:text-6xl font-black tracking-tighter leading-none ${textCls}`}>
                  Omni-Agent
                  <span className="block mt-1 bg-gradient-to-r from-indigo-400 via-purple-400 to-indigo-400 bg-clip-text text-transparent">Command Center</span>
                </h1>
                <p className={`text-base sm:text-lg ${textMuted} max-w-xl mx-auto leading-relaxed font-light`}>
                  Web3 Security · Footprint Optimizer · Charity Protocol · Disaster Recovery
                </p>
              </div>

              {/* Pre-connect stats */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className={`rounded-xl border p-4 shadow-md ${dark ? 'bg-slate-900/60 border-slate-800' : 'bg-white border-slate-200'}`}>
                  <div className="flex items-center justify-between mb-2">
                    <span className={`text-xs font-semibold uppercase tracking-widest ${textMuted}`}>LTC / USD</span>
                    {ltcData && (ltcData.usd_24h_change >= 0 ? <TrendingUp className="w-4 h-4 text-emerald-400" /> : <TrendingDown className="w-4 h-4 text-red-400" />)}
                  </div>
                  {ltcLoading
                    ? <div className={`h-7 w-24 rounded animate-pulse ${skeletonBg}`} />
                    : ltcData
                      ? (<>
                          <p className={`text-2xl font-black font-mono ${textCls}`}>${ltcData.usd?.toFixed(2) ?? '—'}</p>
                          <p className={`text-xs mt-1 font-mono font-semibold ${ltcData.usd_24h_change >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                            {ltcData.usd_24h_change >= 0 ? '+' : ''}{ltcData.usd_24h_change?.toFixed(2)}% 24h
                          </p>
                        </>)
                      : <p className={`text-sm ${textMuted}`}>Unavailable</p>
                  }
                </div>

                <div className={`rounded-xl border p-4 shadow-md ${dark ? 'bg-slate-900/60 border-slate-800' : 'bg-white border-slate-200'}`}>
                  <p className={`text-xs font-semibold uppercase tracking-widest mb-2 ${textMuted}`}>LTC Market Cap</p>
                  {ltcLoading
                    ? <div className={`h-7 w-28 rounded animate-pulse ${skeletonBg}`} />
                    : <p className={`text-xl font-black font-mono ${textCls}`}>{ltcData?.usd_market_cap ? `$${(ltcData.usd_market_cap / 1e9).toFixed(2)}B` : '—'}</p>
                  }
                  <p className={`text-xs mt-1 ${textMuted}`}>CoinGecko Live</p>
                </div>

                <div className={`rounded-xl border p-4 shadow-md ${dark ? 'bg-slate-900/60 border-slate-800' : 'bg-white border-slate-200'}`}>
                  <div className="flex items-center gap-1.5 mb-2">
                    <Clock className={`w-3.5 h-3.5 ${textMuted}`} />
                    <p className={`text-xs font-semibold uppercase tracking-widest ${textMuted}`}>Latest Block</p>
                  </div>
                  {chainLoading || blockNumber == null
                    ? <div className={`h-7 w-28 rounded animate-pulse ${skeletonBg}`} />
                    : <p className={`text-xl font-black font-mono ${textCls}`}>#{blockNumber.toLocaleString()}</p>
                  }
                  <div className="flex items-center gap-1 mt-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    <p className={`text-xs ${textMuted}`}>LitVM Testnet</p>
                  </div>
                </div>

                <div className={`rounded-xl border p-4 shadow-md ${dark ? 'bg-slate-900/60 border-slate-800' : 'bg-white border-slate-200'}`}>
                  <div className="flex items-center gap-1.5 mb-2">
                    <Flame className={`w-3.5 h-3.5 ${textMuted}`} />
                    <p className={`text-xs font-semibold uppercase tracking-widest ${textMuted}`}>Live Gas</p>
                  </div>
                  {chainLoading || gasPrice == null
                    ? <div className={`h-7 w-24 rounded animate-pulse ${skeletonBg}`} />
                    : <p className={`text-xl font-black font-mono ${textCls}`}>{gasPrice} Gwei</p>
                  }
                  <p className={`text-xs mt-1 ${textMuted}`}>+5% buffer applied</p>
                </div>
              </div>

              {/* Contract Info Banner */}
              <div className={`rounded-xl border p-4 flex flex-col sm:flex-row sm:items-center gap-3 ${dark ? 'bg-violet-500/5 border-violet-500/20' : 'bg-violet-50 border-violet-200'}`}>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <FileCode className="w-4 h-4 text-violet-400" />
                  <span className={`text-xs font-black uppercase tracking-widest ${dark ? 'text-violet-300' : 'text-violet-700'}`}>Deployed Contract</span>
                </div>
                <div className="flex items-center gap-2 min-w-0 flex-1">
                  <span className={`text-xs font-mono truncate ${dark ? 'text-slate-300' : 'text-slate-700'}`}>{CONTRACT_ADDRESS}</span>
                  <CopyBtn text={CONTRACT_ADDRESS} dark={dark} />
                </div>
                <a
                  href={`https://liteforge.explorer.caldera.xyz/address/${CONTRACT_ADDRESS}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`flex-shrink-0 text-xs font-semibold px-3 py-1.5 rounded-lg border transition-all ${dark ? 'border-violet-500/30 text-violet-400 hover:bg-violet-500/10' : 'border-violet-300 text-violet-700 hover:bg-violet-100'}`}
                >
                  View on Explorer ↗
                </a>
              </div>

              {/* Connect button */}
              <div className="flex flex-col items-center gap-4 py-6">
                {walletError && (
                  <div className="flex items-center gap-2 px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-sm max-w-md text-center">
                    <AlertTriangle className="w-4 h-4 flex-shrink-0" />{walletError}
                  </div>
                )}
                <button
                  onClick={connectWallet}
                  disabled={connecting}
                  className="relative group px-10 py-5 rounded-2xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-black text-lg sm:text-xl tracking-widest uppercase transition-all duration-300 disabled:opacity-60 disabled:cursor-not-allowed active:scale-95 shadow-2xl"
                >
                  <span className="flex items-center gap-3">
                    {connecting ? <><Spinner size="md" color="indigo" /> INITIALIZING…</> : <><Lock className="w-5 h-5" /> INITIALIZE SECURE LINK</>}
                  </span>
                </button>
                <p className={`text-xs ${textMuted} font-mono`}>Chain ID: {LITVM_CHAIN_ID} · LitVM Testnet</p>
              </div>
            </>
          ) : (
            <>
              {/* ── Post-connect: Live Metrics ── */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
                <MetricCard icon={Wifi}     label="zkLTC Balance" value={`${formatBalance(balance)} zkLTC`}                                    subValue="Native Token"       accent="green"  dark={dark} />
                <MetricCard icon={Activity} label="Tx Nonce"      value={nonce.toString()}                                                       subValue="Total transactions" accent="indigo" dark={dark} />
                <MetricCard icon={Clock}    label="Latest Block"  value={blockNumber != null ? `#${blockNumber.toLocaleString()}` : 'Fetching…'} subValue="LitVM Testnet"      accent="orange" dark={dark} loading={blockNumber == null} />
                <MetricCard icon={Flame}    label="Gas Price"     value={gasPrice != null ? `${gasPrice} Gwei` : 'Fetching…'}                    subValue="+5% buffer applied" accent="red"    dark={dark} loading={gasPrice == null} />
              </div>

              {/* ── Contract Info ── */}
              <div className={`rounded-xl border p-3 flex flex-col sm:flex-row sm:items-center gap-3 ${dark ? 'bg-violet-500/5 border-violet-500/20' : 'bg-violet-50 border-violet-200'}`}>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <FileCode className="w-3.5 h-3.5 text-violet-400" />
                  <span className={`text-xs font-bold uppercase tracking-widest ${dark ? 'text-violet-300' : 'text-violet-700'}`}>Contract</span>
                  <span className={`text-xs px-1.5 py-0.5 rounded font-mono font-semibold ${dark ? 'bg-emerald-500/15 text-emerald-400' : 'bg-emerald-100 text-emerald-700'}`}>LIVE</span>
                </div>
                <div className="flex items-center gap-2 min-w-0 flex-1">
                  <span className={`text-xs font-mono truncate ${dark ? 'text-slate-300' : 'text-slate-700'}`}>{CONTRACT_ADDRESS}</span>
                  <CopyBtn text={CONTRACT_ADDRESS} dark={dark} />
                </div>
                <a
                  href={`https://liteforge.explorer.caldera.xyz/address/${CONTRACT_ADDRESS}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`flex-shrink-0 text-xs font-semibold px-3 py-1.5 rounded-lg border transition-all ${dark ? 'border-violet-500/30 text-violet-400 hover:bg-violet-500/10' : 'border-violet-300 text-violet-700 hover:bg-violet-100'}`}
                >
                  Explorer ↗
                </a>
              </div>

              {/* ── MODULE 1 · Sybil Defense Radar ── */}
              <SectionCard accent="indigo" dark={dark}>
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <Shield className="w-4 h-4 text-indigo-400" />
                      <h2 className={`text-xs font-black uppercase tracking-widest ${dark ? 'text-indigo-300' : 'text-indigo-700'}`}>SYBIL DEFENSE RADAR</h2>
                    </div>
                    <p className={`text-xs ${textMuted} mb-4`}>On-chain identity verification based on activity metrics</p>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className={`text-xs font-semibold ${textMuted}`}>Trust Score</span>
                        <span className={`text-2xl font-black font-mono ${dark ? 'text-indigo-300' : 'text-indigo-700'}`}>{sybilScore}<span className={`text-sm font-normal ${textMuted}`}>/100</span></span>
                      </div>
                      <div className={`w-full h-2.5 rounded-full overflow-hidden ${dark ? 'bg-slate-800' : 'bg-slate-100'}`}>
                        <div className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-purple-500 transition-all duration-700" style={{ width: `${sybilScore}%` }} />
                      </div>
                    </div>
                  </div>
                  <div className="flex flex-col items-start sm:items-end gap-2">
                    <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-black uppercase tracking-widest ${sybilBadge.bg} ${sybilBadge.color}`}>
                      <Award className="w-3 h-3" />{sybilBadge.label}
                    </span>
                    <div className={`flex items-center gap-1.5 text-xs ${textMuted}`}>
                      <span className="font-mono">{truncateAddress(account)}</span>
                      <CopyBtn text={account} dark={dark} />
                    </div>
                    {parseFloat(balance) > 0.01 && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/10 border border-emerald-500/30 text-emerald-400">
                        <CheckCircle className="w-3 h-3" /> Balance Verified +20pts
                      </span>
                    )}
                    {nonce > 0 && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-blue-500/10 border border-blue-500/30 text-blue-400">
                        <Activity className="w-3 h-3" /> {nonce} Txs +{Math.min(nonce * 5, 60)}pts
                      </span>
                    )}
                  </div>
                </div>
              </SectionCard>

              {/* ── MODULE 2 · AI Footprint Optimizer ── */}
              <SectionCard accent="green" dark={dark}>
                <div className="flex items-center gap-2 mb-1">
                  <Zap className="w-4 h-4 text-emerald-400" />
                  <h2 className={`text-xs font-black uppercase tracking-widest ${dark ? 'text-emerald-300' : 'text-emerald-800'}`}>AI AGENTIC OPTIMIZATION ENGINE</h2>
                </div>
                <p className={`text-xs ${textMuted} mb-1`}>Permanently records an on-chain footprint via a signed self-transfer on LitVM.</p>
                <p className={`text-xs font-mono mb-5 ${dark ? 'text-emerald-400/70' : 'text-emerald-700/80'}`}>
                  Identifier: <span className={dark ? 'text-emerald-300' : 'text-emerald-800'}>{FOOTPRINT_LABEL}</span> · Plain transfer (no data — LitVM compatible)
                </p>
                {footprintStatus === 'success' && footprintTx && (
                  <div className={`mb-4 p-4 rounded-xl border ${dark ? 'bg-emerald-500/5 border-emerald-500/20' : 'bg-emerald-50 border-emerald-200'}`}>
                    <div className="flex items-center gap-2 mb-2">
                      <CheckCircle className="w-4 h-4 text-emerald-400" />
                      <span className="text-xs font-bold text-emerald-400 uppercase tracking-wider">Footprint Recorded On-Chain</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`text-xs font-mono truncate ${dark ? 'text-slate-400' : 'text-slate-600'}`}>{footprintTx}</span>
                      <CopyBtn text={footprintTx} dark={dark} />
                    </div>
                  </div>
                )}
                {footprintStatus === 'error' && (
                  <div className={`mb-4 p-3 rounded-xl border text-xs ${dark ? 'bg-red-500/5 border-red-500/20 text-red-400' : 'bg-red-50 border-red-200 text-red-700'}`}>
                    {footprintError}
                  </div>
                )}
                <button
                  onClick={runFootprintOptimizer}
                  disabled={footprintStatus === 'loading'}
                  className="flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-500 hover:to-green-500 text-white font-bold text-sm tracking-widest uppercase transition-all active:scale-95 disabled:opacity-60 disabled:cursor-not-allowed shadow-lg"
                >
                  {footprintStatus === 'loading' ? <><Spinner color="green" /> OPTIMIZING…</> : <><Zap className="w-4 h-4" /> RUN OPTIMIZATION</>}
                </button>
              </SectionCard>

              {/* ── MODULE 3 · Disaster Recovery ── */}
              <SectionCard accent="orange" dark={dark}>
                <div className="flex items-center gap-2 mb-1">
                  <AlertTriangle className="w-4 h-4 text-orange-400 animate-pulse" />
                  <h2 className={`text-xs font-black uppercase tracking-widest ${dark ? 'text-orange-300' : 'text-orange-800'}`}>🚨 CRITICAL ASSET EVACUATION (PANIC BUTTON)</h2>
                </div>
                <p className={`text-xs ${textMuted} mb-5`}>Emergency sweep of all native funds to a safe wallet. Calculates exact max transferable amount after gas deduction.</p>
                <div className="space-y-3">
                  <div>
                    <label className={`block text-xs font-semibold mb-1.5 ${textMuted}`}>Destination Safe Wallet Address</label>
                    <div className="relative">
                      <input
                        type="text"
                        placeholder="0x... (Destination Safe Wallet)"
                        value={evacAddress}
                        onChange={(e) => validateEvacAddress(e.target.value)}
                        className={`w-full px-4 py-3 pr-10 rounded-xl border text-sm font-mono transition-all outline-none focus:ring-2 focus:ring-orange-500/30 ${inputBase} ${evacAddressValid === true ? (dark ? '!border-emerald-500/50' : '!border-emerald-500') : evacAddressValid === false ? (dark ? '!border-red-500/50' : '!border-red-500') : ''}`}
                      />
                      {evacAddressValid === true  && <CheckCircle className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-emerald-400" />}
                      {evacAddressValid === false && <XCircle     className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-red-400" />}
                    </div>
                    {evacAddressValid === false && <p className="text-xs mt-1 flex items-center gap-1 text-red-500"><AlertTriangle className="w-3 h-3" /> Invalid Ethereum address format</p>}
                    {evacAddressValid === true  && <p className="text-xs text-emerald-500 mt-1 flex items-center gap-1"><CheckCircle className="w-3 h-3" /> Valid address confirmed</p>}
                  </div>

                  {(evacStatus === 'loading' || evacStatus === 'success' || evacStatus === 'error') && (
                    <div className="rounded-xl border border-orange-500/20 bg-black/60 p-4 font-mono text-xs space-y-1">
                      <p className="text-orange-400">{'>'} ASSET EVACUATION PROTOCOL INITIATED</p>
                      {evacStatus === 'loading' && <p className="text-yellow-300 flex items-center gap-2"><Spinner size="sm" color="orange" /> EVACUATING… SWEEPING BALANCE TO SAFE WALLET</p>}
                      {evacStatus === 'success' && evacTx && (
                        <>
                          <p className="text-emerald-400">{'>'} ✓ ASSETS SECURED</p>
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="text-slate-300">TX: {evacTx.slice(0,20)}…{evacTx.slice(-8)}</p>
                            <CopyBtn text={evacTx} dark={true} />
                          </div>
                        </>
                      )}
                      {evacStatus === 'error' && <p className="text-red-400">{'>'} ERROR: {evacError}</p>}
                    </div>
                  )}

                  {evacError && evacStatus !== 'loading' && (
                    <p className="text-xs text-red-400 flex items-center gap-1.5"><AlertTriangle className="w-3 h-3" /> {evacError}</p>
                  )}

                  <button
                    onClick={runEvacuation}
                    disabled={evacStatus === 'loading' || !evacAddressValid}
                    className="w-full sm:w-auto flex items-center justify-center gap-2 px-8 py-4 rounded-xl font-black text-sm tracking-widest uppercase text-white transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed shadow-xl"
                    style={{ background: 'linear-gradient(135deg,#dc2626,#ea580c)' }}
                  >
                    {evacStatus === 'loading' ? <><Spinner color="orange" /> EVACUATING…</> : <><AlertTriangle className="w-4 h-4" /> INITIATE EMERGENCY ASSET SWEEP</>}
                  </button>
                </div>
              </SectionCard>

              {/* ── MODULE 4 · Charity Protocol ── */}
              <SectionCard accent="red" dark={dark}>
                <div className="flex items-center gap-2 mb-1">
                  <Heart className="w-4 h-4 text-rose-400" />
                  <h2 className={`text-xs font-black uppercase tracking-widest ${dark ? 'text-rose-300' : 'text-rose-800'}`}>TRANSPARENT ECOSYSTEM CHARITY MODULE</h2>
                </div>
                <p className={`text-xs ${textMuted} mb-1`}>
                  Beneficiary: <span className={`font-mono break-all ${dark ? 'text-rose-400' : 'text-rose-700'}`}>{CHARITY_ADDRESS}</span>
                </p>
                <div className={`inline-flex items-center gap-2 px-3 py-2 rounded-lg border mb-5 mt-2 ${dark ? 'bg-rose-500/5 border-rose-500/20' : 'bg-rose-50 border-rose-200'}`}>
                  <Award className="w-3.5 h-3.5 text-rose-400" />
                  <span className={`text-xs font-bold ${dark ? 'text-rose-300' : 'text-rose-800'}`}>LIFETIME DONATED: {formatBalance(lifetimeDonated, 6)} zkLTC</span>
                </div>
                <div className="space-y-2">
                  <div className="flex gap-3">
                    <div className="flex-1 relative">
                      <input
                        type="number"
                        min={MIN_DONATION}
                        step="0.000001"
                        placeholder={`Min ${MIN_DONATION} zkLTC`}
                        value={donateAmount}
                        onChange={(e) => { setDonateAmount(e.target.value); setDonateError(''); }}
                        className={`w-full px-4 py-3 rounded-xl border text-sm font-mono transition-all outline-none focus:ring-2 focus:ring-rose-500/30 ${inputBase}`}
                      />
                    </div>
                    <button
                      onClick={runDonation}
                      disabled={donateStatus === 'loading'}
                      className="flex items-center gap-2 px-5 py-3 rounded-xl bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-500 hover:to-red-500 text-white font-bold text-sm tracking-widest uppercase transition-all active:scale-95 disabled:opacity-60 disabled:cursor-not-allowed shadow-lg whitespace-nowrap"
                    >
                      {donateStatus === 'loading' ? <><Spinner color="red" /> SENDING…</> : <><Heart className="w-4 h-4" /> DONATE</>}
                    </button>
                  </div>
                  <p className={`text-xs ${textMuted}`}>Minimum: <span className="font-mono font-semibold">{MIN_DONATION} zkLTC</span> — any amount accepted above this threshold</p>
                  {donateError && <p className="text-xs text-red-400 flex items-center gap-1.5"><AlertTriangle className="w-3 h-3" /> {donateError}</p>}
                </div>

                {donateReceipt && (
                  <div className={`mt-5 rounded-xl border p-4 space-y-3 ${dark ? 'bg-slate-800/60 border-rose-500/25' : 'bg-rose-50 border-rose-200'}`}>
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className={`text-xs font-black uppercase tracking-widest ${dark ? 'text-rose-300' : 'text-rose-800'}`}>CRYPTOGRAPHIC PROOF OF DONATION RECEIPT</span>
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold bg-emerald-500/15 border border-emerald-500/30 text-emerald-400">
                        <CheckCircle className="w-3 h-3" /> VERIFIED ON-CHAIN
                      </span>
                    </div>
                    <div className={`space-y-1.5 text-xs font-mono ${dark ? 'text-slate-400' : 'text-slate-700'}`}>
                      <div className="flex flex-wrap gap-x-2"><span className={dark ? 'text-slate-500' : 'text-slate-500'}>DONOR:</span><span className="break-all">{donateReceipt.donor}</span></div>
                      <div className="flex flex-wrap gap-x-2"><span className={dark ? 'text-slate-500' : 'text-slate-500'}>BENEFICIARY:</span><span className="break-all">{donateReceipt.beneficiary}</span></div>
                      <div className="flex gap-x-2"><span className={dark ? 'text-slate-500' : 'text-slate-500'}>VALUE:</span><span className="text-rose-400 font-bold">{donateReceipt.value} zkLTC</span></div>
                      <div className="flex gap-x-2"><span className={dark ? 'text-slate-500' : 'text-slate-500'}>TIME:</span><span>{donateReceipt.timestamp}</span></div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={dark ? 'text-slate-500' : 'text-slate-500'}>TX HASH:</span>
                        <span className="break-all">{donateReceipt.hash}</span>
                        <button
                          onClick={() => copyTxHash(donateReceipt.hash)}
                          className={`flex items-center gap-1 px-2 py-0.5 rounded border text-xs transition-all ${dark ? 'border-slate-700 hover:bg-slate-700 text-slate-400 hover:text-white' : 'border-slate-300 hover:bg-slate-100 text-slate-500 hover:text-slate-800'}`}
                        >
                          {copiedTx ? <CheckCircle className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                          {copiedTx ? 'Copied' : 'Copy'}
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </SectionCard>

              {/* ── MODULE 5 · Social Share ── */}
              <SectionCard accent="indigo" dark={dark}>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <Share2 className="w-4 h-4 text-indigo-400" />
                      <h2 className={`text-xs font-black uppercase tracking-widest ${dark ? 'text-indigo-300' : 'text-indigo-700'}`}>Share Your Score</h2>
                    </div>
                    <p className={`text-xs ${textMuted}`}>
                      Trust Score: <span className={`font-bold font-mono ${dark ? 'text-indigo-400' : 'text-indigo-700'}`}>{sybilScore}/100</span> · {sybilBadge.label}
                    </p>
                  </div>
                  <button
                    onClick={shareOnX}
                    className="flex items-center gap-2.5 px-5 py-2.5 rounded-xl bg-black hover:bg-slate-800 text-white font-bold text-sm tracking-wide transition-all active:scale-95 shadow-md border border-slate-700"
                  >
                    <XLogo className="w-4 h-4" />
                    Share on X
                  </button>
                </div>
              </SectionCard>
            </>
          )}
        </main>

        {/* ── Footer ── */}
        <footer className={`mt-12 border-t ${border} ${dark ? 'bg-slate-950' : 'bg-white'}`}>
          <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <div className="w-5 h-5 rounded bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center flex-shrink-0">
                <Shield className="w-3 h-3 text-white" />
              </div>
              <p className={`text-xs ${textMuted} font-medium`}>
                Built for <span className={`font-bold ${dark ? 'text-white' : 'text-slate-800'}`}>LitVM Hackathon 2026</span>
              </p>
            </div>
            <a
              href="https://twitter.com/mahamudsultan21"
              target="_blank"
              rel="noopener noreferrer"
              title="@mahamudsultan21 on X"
              className={`flex items-center justify-center w-9 h-9 rounded-xl border transition-all hover:scale-105 ${dark ? 'border-slate-700 bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white' : 'border-slate-200 bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-900'}`}
            >
              <XLogo className="w-4 h-4" />
            </a>
          </div>
        </footer>

      </div>
    </div>
  );
}
