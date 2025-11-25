import React, { useState, Suspense, useEffect, useRef } from "react";
import { BrowserRouter as Router, Routes, Route, Link, useLocation } from "react-router-dom";
import _ from "lodash";
import { Chart, registerables } from "chart.js";
import * as THREE from "three";
import { QueryClient, QueryClientProvider, useQuery } from "@tanstack/react-query";
import { loadRemote } from "@module-federation/enhanced/runtime";

Chart.register(...registerables);

// Create a client
const queryClient = new QueryClient();

console.log(
  "hostbuildtime sharescope",
  __webpack_share_scopes__
);
console.log("hostbuildtime lodash version:", _.VERSION);

// Custom hook for dynamic remote loading
function useDynamicRemote({ scope, module }) {
  const [component, setComponent] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!scope || !module) {
      setComponent(null);
      return;
    }

    const loadComponent = async () => {
      setLoading(true);
      setError(null);
      try {
        console.log(`[Dynamic Load] Loading ${scope}/${module}...`);
        const startTime = performance.now();
        const { default: Component } = await loadRemote(`${scope}/${module}`);
        const loadTime = performance.now() - startTime;
        console.log(`[Dynamic Load] ${scope}/${module} loaded in ${loadTime.toFixed(2)}ms`);
        setComponent(() => Component);
      } catch (err) {
        console.error(`[Dynamic Load] Error loading ${scope}/${module}:`, err);
        setError(err);
      } finally {
        setLoading(false);
      }
    };

    loadComponent();
  }, [scope, module]);

  return { component, loading, error };
}

// Mock API function
const fetchAppStats = async () => {
  // Simulate API delay
  await new Promise(resolve => setTimeout(resolve, 1000));
  return {
    totalUsers: _.random(1000, 5000),
    activeApps: 3,
    lastUpdated: new Date().toISOString(),
  };
};

// Navigation component to show current route
function Navigation() {
  const location = useLocation();

  return (
    <nav style={{
      padding: "1em",
      backgroundColor: "#f0f0f0",
      marginBottom: "1em",
      borderRadius: "4px"
    }}>
      <div style={{ marginBottom: "0.5em" }}>
        <strong>React Router Demo (Shared Library)</strong>
      </div>
      <div style={{ display: "flex", gap: "1em", marginBottom: "0.5em" }}>
        <Link to="/" style={{ textDecoration: location.pathname === "/" ? "underline" : "none" }}>
          Home
        </Link>
        <Link to="/demos" style={{ textDecoration: location.pathname === "/demos" ? "underline" : "none" }}>
          Demos
        </Link>
        <Link to="/remotes" style={{ textDecoration: location.pathname === "/remotes" ? "underline" : "none" }}>
          Remotes
        </Link>
      </div>
      <div style={{ fontSize: "0.8em", color: "#666" }}>
        Current route: <code>{location.pathname}</code>
      </div>
    </nav>
  );
}

// Home page component
function HomePage() {
  return (
    <div style={{ padding: "2em", textAlign: "center" }}>
      <h2>Welcome to Module Federation Enhanced</h2>
      <p>This is the home page demonstrating React Router navigation.</p>
      <p>Navigate to different sections using the links above.</p>

      <div style={{
        marginTop: "2em",
        padding: "1em",
        backgroundColor: "#f5f5f5",
        borderRadius: "4px",
        fontSize: "0.9em"
      }}>
        <h3>ℹ️ Remote Preloading</h3>
        <p style={{ fontSize: "0.9em", color: "#666" }}>
          Remotes (app2 and app3) are preloaded in bootstrap.js before the app renders.
        </p>
        <p style={{ fontSize: "0.9em", color: "#666" }}>
          Navigate to "Remotes" to see instant loading with no waterfall requests!
        </p>
        <p style={{ fontSize: "0.85em", color: "#999", marginTop: "1em" }}>
          Check the console for preload timing logs.
        </p>
      </div>
    </div>
  );
}

// Demos page component
function DemosPage() {
  const chartRef = useRef(null);
  const chartInstance = useRef(null);
  const threeRef = useRef(null);
  const threeScene = useRef(null);

  // TanStack Query usage
  const { data: appStats, isLoading, error } = useQuery({
    queryKey: ['appStats'],
    queryFn: fetchAppStats,
    refetchInterval: 30000, // Refetch every 30 seconds
  });

  // Chart.js setup
  useEffect(() => {
    if (chartRef.current) {
      // Destroy existing chart if it exists
      if (chartInstance.current) {
        chartInstance.current.destroy();
      }

      // Create a simple bar chart showing lodash usage
      const data = [1, 2, 3, 4, 5];
      chartInstance.current = new Chart(chartRef.current, {
        type: 'bar',
        data: {
          labels: ['Min', 'Q1', 'Median', 'Q3', 'Max'],
          datasets: [{
            label: 'Lodash Stats Demo',
            data: [_.min(data), _.nth(data, 1), _.nth(data, 2), _.nth(data, 3), _.max(data)],
            backgroundColor: 'rgba(54, 162, 235, 0.6)',
            borderColor: 'rgba(54, 162, 235, 1)',
            borderWidth: 1
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          scales: {
            y: {
              beginAtZero: true
            }
          }
        }
      });
    }

    return () => {
      if (chartInstance.current) {
        chartInstance.current.destroy();
      }
    };
  }, []);

  // Three.js setup
  useEffect(() => {
    if (threeRef.current) {
      // Clear any existing content
      threeRef.current.innerHTML = '';

      // Create scene, camera, and renderer
      const scene = new THREE.Scene();
      const camera = new THREE.PerspectiveCamera(75, 200 / 150, 0.1, 1000);
      const renderer = new THREE.WebGLRenderer();
      renderer.setSize(200, 150);
      threeRef.current.appendChild(renderer.domElement);

      // Create a green cube
      const geometry = new THREE.BoxGeometry();
      const material = new THREE.MeshBasicMaterial({ color: 0x00ff00 });
      const cube = new THREE.Mesh(geometry, material);
      scene.add(cube);

      camera.position.z = 5;

      // Animation loop
      function animate() {
        requestAnimationFrame(animate);
        cube.rotation.x += 0.01;
        cube.rotation.y += 0.01;
        renderer.render(scene, camera);
      }
      animate();

      threeScene.current = { scene, camera, renderer, cube };
    }

    return () => {
      if (threeScene.current) {
        threeScene.current.renderer.dispose();
      }
    };
  }, []);

  return (
    <div>
      <h2>Shared Library Demos</h2>
      <div style={{
        display: "grid",
        gridTemplateColumns: "1fr 1fr",
        gap: "2em",
        marginBottom: "2em"
      }}>
        <div>
          <h3>Chart.js Demo (Shared Library)</h3>
          <canvas ref={chartRef} style={{ maxWidth: "100%", maxHeight: "200px" }}></canvas>
        </div>

        <div>
          <h3>Three.js Demo (Shared Library)</h3>
          <canvas ref={threeRef} style={{ border: "1px solid #ccc", maxWidth: "100%" }}></canvas>
        </div>

        <div>
          <h3>TanStack Query Demo (Shared Library)</h3>
          {isLoading && <p>Loading app stats...</p>}
          {error && <p style={{ color: 'red' }}>Error: {error.message}</p>}
          {appStats && (
            <div style={{ padding: "1em", backgroundColor: "#f5f5f5", borderRadius: "4px" }}>
              <p><strong>Total Users:</strong> {appStats.totalUsers.toLocaleString()}</p>
              <p><strong>Active Apps:</strong> {appStats.activeApps}</p>
              <p><strong>Last Updated:</strong> {new Date(appStats.lastUpdated).toLocaleTimeString()}</p>
            </div>
          )}
        </div>

        <div>
          {/* Empty cell for 2x2 grid */}
        </div>
      </div>
    </div>
  );
}

// Remotes page component
function RemotesPage() {
  const [{ scope, module }, setRemote] = useState({});

  const setApp2 = () => {
    setRemote({
      scope: "app2",
      module: "Widget",
    });
  };

  const setApp3 = () => {
    setRemote({
      scope: "app3",
      module: "Widget",
    });
  };

  const { component: RemoteComponent, loading, error } = useDynamicRemote({ scope, module });

  return (
    <div>
      <h2>Remote Applications</h2>
      <p>Load and test remote Module Federation applications using dynamic loadRemote:</p>

      <div style={{ marginBottom: "1em" }}>
        <button onClick={setApp2} style={{ marginRight: "1em" }}>
          Load App 2 Widget
        </button>
        <button onClick={setApp3}>
          Load App 3 Widget
        </button>
      </div>

      <div style={{ marginTop: "2em" }}>
        {loading && <p>Loading remote application...</p>}
        {error && <p style={{ color: "red" }}>Error loading remote: {error.message}</p>}
        <Suspense fallback="Loading Remote Application...">
          {RemoteComponent && <RemoteComponent />}
        </Suspense>
      </div>
    </div>
  );
}

// Main App component with routing
function App() {
  return (
    <Router>
      <div
        style={{
          fontFamily:
            '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif, "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol"',
        }}
      >
        <h1>Dynamic System Host - MF-Enhanced</h1>

        <Navigation />

        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/demos" element={<DemosPage />} />
          <Route path="/remotes" element={<RemotesPage />} />
        </Routes>
      </div>
    </Router>
  );
}

// Wrap App with QueryClientProvider
function AppWithQuery() {
  return (
    <QueryClientProvider client={queryClient}>
      <App />
    </QueryClientProvider>
  );
}

export default AppWithQuery;
