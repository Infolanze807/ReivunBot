import React, { useState, useEffect } from "react";
import axios from "axios";
import { FiActivity } from "react-icons/fi";
import { BsStars } from "react-icons/bs";
import io from 'socket.io-client';
import { Line } from "react-chartjs-2";
import logo from "./Images/gno-wallet.png";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
} from "chart.js";

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
);

const App = () => {
  const [chartData, setChartData] = useState({ labels: [], datasets: [] });
  const [isRunning, setIsRunning] = useState(false);
  const [symbolsData, setSymbolsData] = useState({});
  const [loading, setLoading] = useState(true);
  const [isSocketLoading, setIsSocketLoading] = useState(false);
  const [error, setError] = useState(null);
  const [state, setState] = useState({
    loading: false,
    isSocketLoading: false,
    error: null,
  });
  const [socketInstance, setSocketInstance] = useState(null);
  const [credentials, setCredentials] = useState({
    apiKey: "",
    secretKey: "",
    passphrase: ""
  });
  const [config, setConfig] = useState({
    timeframe: "1m",
    leverage: 1,
    tradeAmount: 100,
    demoMode: true,
  });

  const handleConfigChange = (e) => {
    const { name, value, type, checked } = e.target;
    setConfig((prevConfig) => ({
      ...prevConfig,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const handleCredentialsChange = (e) => {
    const { name, value } = e.target;
    setCredentials((prevCredentials) => ({
      ...prevCredentials,
      [name]: value
    }));
  };

  const handleStartStopBot = async () => {
    if (isRunning) {
      setIsRunning(false);
      console.log("Bot stopped");
      if (socketInstance) {
        socketInstance.disconnect();
        setSocketInstance(null);
      }
    } else {
      await startBotByUser();
    }
  };

  const startBotByUser = async () => {
    if (!config.demoMode) {
      alert("Bot cannot run when demo mode is off!");
      return;
    }

    if (!credentials.apiKey || !credentials.secretKey || !credentials.passphrase) {
      setError("Missing API credentials");
      console.error("Error: Missing API credentials");
      return;
    }

    setState({ loading: true, isSocketLoading: true, error: null });

    try {
      const response = await axios.get("https://reivun-gkdi.vercel.app/symbols", {
        params: {
          apiKey: credentials.apiKey,
          secretKey: credentials.secretKey,
          passphrase: credentials.passphrase,
        },
      });

      setSymbolsData(response.data);
      console.log(response.data, "get");

      setIsRunning(true);

      const socket = io("https://reivun-gkdi.vercel.app");

      socket.on("connect", () => {
        console.log("Connected to server");
        setState({ ...state, isSocketLoading: false });
      });

      socket.on("symbolsData", (data) => {
        console.log("Socket.IO message received:", data);
        setSymbolsData((prevData) => ({ ...prevData, ...data }));
      });

      socket.on("error", (error) => {
        setState({ ...state, error: "Error with Socket.IO connection" });
        console.error("Socket.IO error:", error);
      });

      socket.on("disconnect", () => {
        console.log("Disconnected from server");
        setState({ ...state, isSocketLoading: true });
      });

      setSocketInstance(socket);
    } catch (error) {
      setState({ loading: false, error: "Error fetching data from API" });
      console.error("Error fetching data from API:", error);
    } finally {
      setState((prevState) => ({ ...prevState, loading: false }));
    }
  };

  const saveCredentials = async () => {
    try {
      localStorage.setItem("apiCredentials", JSON.stringify(credentials));
      await startBotByUser();
    } catch (error) {
      console.error("Error saving credentials:", error);
    }
  };

  const fetchBTCPrices = async () => {
    try {
      const response = await axios.get(
        "https://api.binance.com/api/v3/klines",
        {
          params: {
            symbol: "BTCUSDT",
            interval: "1m",
            limit: 50,
          },
        }
      );

      const prices = response.data.map((point) => ({
        time: new Date(point[0]).toLocaleTimeString(),
        price: parseFloat(point[4]),
      }));

      setChartData({
        labels: prices.map((p) => p.time),
        datasets: [
          {
            label: "BTC/USDT Price",
            data: prices.map((p) => p.price),
            borderColor: "rgba(75, 192, 192, 1)",
            backgroundColor: "rgba(75, 192, 192, 0.2)",
            borderWidth: 2,
          },
        ],
      });
    } catch (error) {
      console.error("Error fetching BTC prices:", error);
    }
  };

  useEffect(() => {
    fetchBTCPrices();
    const interval = setInterval(fetchBTCPrices, 60000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const savedCredentials = JSON.parse(localStorage.getItem("apiCredentials"));
    if (savedCredentials) {
      setCredentials(savedCredentials);
    }
  }, []);

  useEffect(() => {
    return () => {
      if (socketInstance) {
        socketInstance.disconnect();
        console.log("Socket disconnected");
      }
    };
  }, [socketInstance]);

  return (
    <div className="min-h-screen bg-[--bg-color] p-4">
      <div className="mx-auto max-w-7xl space-y-4">
        <header className="flex items-center justify-between">
          <div className="lg:col-span-4 col-span-6">
            <a href="https://reivun.cloud/" className="flex items-center grid-cols-3 space-x-3">
              <img
               src={logo}
                className="md:w-16 w-12 rounded-full"
                alt="Reivun Logo"
              />
              <span className="text-3xl font-semibold text-[--main-color]">
                Reivun Bot
              </span>
            </a>
          </div>
        </header>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4 bg-white rounded-lg p-5">
          <div className="p-2 lg:p-0 lg:px-3 rounded-full shadow flex items-center gap-2">
            <FiActivity className="text-lg" />
            <h3 className="text-sm">5 markets to watch</h3>
          </div>
          <p className="text-gray-600 pt-1">
            Automatic analysis of crypto markets in real time
          </p>
          <div className="p-2 lg:p-0 lg:px-3 rounded-full shadow flex items-center gap-2">
            <BsStars className="text-lg" />
            <h3 className="text-sm"> Automatic analysis active</h3>
          </div>
          <button
            onClick={handleStartStopBot}
            className="bg-[--green-color] hover:bg-[--main-color] text-white font-bold p-2 rounded"
          >
            {isRunning ? "Stop the Bot" : "Start the Bot"}
          </button>
        </div>

        <div className="grid gap-4 md:grid-cols-2 h-full w-full">
          {/* <div className="bg-white p-2 rounded-lg shadow overflow-hidden">
            <h2 className="mb-4 text-xl font-semibold">Watched Market</h2>
            {loading || isSocketLoading ? (
              <div className="flex justify-center items-center h-[250px] text-xl text-[--green-color] font-bold">
                <div className="animate-spin rounded-full h-12 w-12 border-t-4 border-[--green-color] border-solid"></div>
              </div>
            ) : Object.entries(symbolsData).length === 0 ? (
              <div className="flex justify-center items-center h-[250px] text-xl text-gray-500 font-bold">
                No data available
              </div>
            ) : (
              <div className="bg-[--bg-color] rounded-lg px-2 overflow-y-scroll max-h-[300px]">
                {Object.entries(symbolsData).map(([symbol, data]) => (
                  <div key={symbol} className="py-2">
                    <div className="flex justify-between border-b border-[--green-color] pb-1 text-sm sm:text-sm md:text-base lg:text-lg">
                      <h3 className="text-[--green-color]">{symbol}</h3>
                      <h4 className="text-gray-400">{data.timestamp}</h4>
                    </div>
                    <div className="overflow-x-auto sm:overflow-x-hidden">
                      <table className="w-full min-w-[450px] sm:min-w-[100%]">
                        <thead>
                          <tr className="text-xs text-[--green-color] font-thin">
                            <th className="px-2">Open</th>
                            <th className="px-2">High</th>
                            <th className="px-2">Low</th>
                            <th className="px-2">Close</th>
                            <th className="px-2">Volume</th>
                            <th className="px-2">Hammer</th>
                          </tr>
                        </thead>
                        <tbody>
                          <tr className="text-xs text-center text-gray-400">
                            <td className="">{data?.open?.toFixed(2)}</td>
                            <td className="">{data?.high?.toFixed(2)}</td>
                            <td className="">{data?.low?.toFixed(2)}</td>
                            <td className="">{data?.close?.toFixed(2)}</td>
                            <td className="">{data?.volume?.toFixed(2)}</td>
                            <td className="">{data?.isHammer ? "Yes" : "No"}</td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div> */}
          <div className="bg-white p-2 rounded-lg shadow overflow-hidden">
      <h2 className="mb-4 text-xl font-semibold">Watched Market</h2>
      {state.loading || state.isSocketLoading ? (
        <div className="flex justify-center items-center h-[250px] text-xl text-[--green-color] font-bold">
          <div className="animate-spin rounded-full h-12 w-12 border-t-4 border-[--green-color] border-solid"></div>
        </div>
      ) : state.error ? (
        <div className="flex justify-center items-center h-[250px] text-xl text-red-500 font-bold">
          {state.error}
        </div>
      ) : Object.entries(symbolsData).length === 0 ? (
        <div className="flex justify-center items-center h-[250px] text-xl text-gray-500 font-bold">
          No data available
        </div>
      ) : (
        <div className="bg-[--bg-color] rounded-lg px-2 overflow-y-scroll max-h-[300px]">
          {Object.entries(symbolsData).map(([symbol, data]) => (
            <div key={symbol} className="py-2">
              <div className="flex justify-between border-b border-[--green-color] pb-1 text-sm">
                <h3 className="text-[--green-color]">{symbol}</h3>
                <h4 className="text-gray-400">{data.timestamp}</h4>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="text-xs text-[--green-color] font-thin">
                      <th className="px-2">Open</th>
                      <th className="px-2">High</th>
                      <th className="px-2">Low</th>
                      <th className="px-2">Close</th>
                      <th className="px-2">Volume</th>
                      <th className="px-2">Hammer</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="text-xs text-center text-gray-400">
                      <td>{data?.open?.toFixed(2)}</td>
                      <td>{data?.high?.toFixed(2)}</td>
                      <td>{data?.low?.toFixed(2)}</td>
                      <td>{data?.close?.toFixed(2)}</td>
                      <td>{data?.volume?.toFixed(2)}</td>
                      <td>{data?.isHammer ? "Yes" : "No"}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>

          <div className="bg-white p-6 rounded-lg shadow">
            <h2 className="mb-4 text-xl font-semibold">
              Configuration For Bot
            </h2>
            <div className="space-y-4">
              <div>
                <label className="mb-2 block text-sm font-medium">
                  Timeframe
                </label>
                <select
                  name="timeframe"
                  value={config.timeframe}
                  onChange={handleConfigChange}
                  className="w-full border rounded-md p-2"
                >
                  <option value="1m">1m</option>
                  <option value="5m">5m</option>
                  <option value="15m">15m</option>
                </select>
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium">
                  Leverage
                </label>
                <input
                  type="number"
                  name="leverage"
                  value={config.leverage}
                  onChange={handleConfigChange}
                  className="w-full border rounded-md p-2"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium">
                  Trade Amount (USDT)
                </label>
                <input
                  type="number"
                  name="tradeAmount"
                  value={config.tradeAmount}
                  onChange={handleConfigChange}
                  className="w-full border rounded-md p-2"
                />
              </div>

              <div className="flex items-center justify-between">
                <span>Demo Mode</span>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    name="demoMode"
                    checked={config.demoMode}
                    onChange={handleConfigChange}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[--green-color]"></div>
                </label>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="mb-4 text-xl font-semibold">API Configuration</h2>
          <div className="grid gap-4 md:grid-cols-3">
            <div>
              <label className="mb-2 block text-sm font-medium">API Key</label>
              <input
                type="password"
                name="apiKey"
                value={credentials.apiKey}
                onChange={handleCredentialsChange}
                placeholder="Enter your Bitget API key"
                className="w-full border rounded-md p-2"
              />
            </div>
            <div>
              <label className="mb-2 block text-sm font-medium">
                Secret Key
              </label>
              <input
                type="password"
                name="secretKey"
                value={credentials.secretKey}
                onChange={handleCredentialsChange}
                placeholder="Enter your Bitget secret key"
                className="w-full border rounded-md p-2"
              />
            </div>
            <div>
              <label className="mb-2 block text-sm font-medium">
                Passphrase
              </label>
              <input
                type="password"
                name="passphrase"
                value={credentials.passphrase}
                onChange={handleCredentialsChange}
                placeholder="Enter your Bitget passphrase"
                className="w-full border rounded-md p-2"
              />
            </div>
          </div>
          <button className="mt-4 w-full bg-[--green-color] hover:bg-[--main-color] text-white font-bold py-2 px-4 rounded" onClick={saveCredentials}>
            Save credentials
          </button>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="mb-4 text-xl font-semibold">BTC/USDT Price Chart</h2>
          <div className="h-[400px] rounded-lg bg-zinc-800 flex items-center justify-center">
            <Line data={chartData} />
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="mb-4 text-xl font-semibold">Trade History</h2>
          <div className="flex h-[200px] items-center justify-center rounded-lg border">
            <h3 className="text-gray-500">No trades at the moment</h3>
          </div>
        </div>
      </div>
    </div>
  );
};

export default App;

