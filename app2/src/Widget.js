import React, { useEffect, useRef } from "react";
import moment from "moment";
import _ from "lodash";
import { Chart, registerables } from "chart.js";
import * as THREE from "three";
import { QueryClient, QueryClientProvider, useQuery } from "@tanstack/react-query";

Chart.register(...registerables);

// Create a client for standalone usage
const queryClient = new QueryClient();

// Mock API for chart data
const fetchChartData = async () => {
  await new Promise(resolve => setTimeout(resolve, 800));
  return {
    datasets: _.range(5).map(i => ({
      label: `Dataset ${i + 1}`,
      value: _.random(10, 100)
    })),
    lastFetch: new Date().toISOString(),
  };
};

// Simple Widget component without routing
function Widget() {
  const chartRef = useRef(null);
  const chartInstance = useRef(null);
  const threeRef = useRef(null);
  const threeScene = useRef(null);

  // TanStack Query for chart data
  const { data: chartData, isLoading: isChartLoading } = useQuery({
    queryKey: ['chartData', 'app2'],
    queryFn: fetchChartData,
    refetchInterval: 20000,
  });

  // Using lodash functions in the widget
  const sampleData = [10, 20, 30, 40, 50];
  const shuffledData = _.shuffle([...sampleData]);
  const maxValue = _.max(sampleData);
  const minValue = _.min(sampleData);
  const average = _.mean(sampleData);

  // Chart.js setup
  useEffect(() => {
    if (chartRef.current) {
      // Destroy existing chart if it exists
      if (chartInstance.current) {
        chartInstance.current.destroy();
      }

      // Create a line chart for app2
      chartInstance.current = new Chart(chartRef.current, {
        type: 'line',
        data: {
          labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May'],
          datasets: [{
            label: 'App2 Line Chart',
            data: shuffledData,
            borderColor: 'rgba(255, 99, 132, 1)',
            backgroundColor: 'rgba(255, 99, 132, 0.2)',
            borderWidth: 2,
            fill: true
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
  }, [shuffledData]);

  // Three.js scene setup
  useEffect(() => {
    if (threeRef.current) {
      const scene = new THREE.Scene();
      const camera = new THREE.PerspectiveCamera(75, 300 / 150, 0.1, 1000);
      const renderer = new THREE.WebGLRenderer({ canvas: threeRef.current });
      renderer.setSize(300, 150);

      // Create a spinning sphere
      const geometry = new THREE.SphereGeometry();
      const material = new THREE.MeshBasicMaterial({ color: 0xff0000, wireframe: true });
      const sphere = new THREE.Mesh(geometry, material);
      scene.add(sphere);

      camera.position.z = 3;

      const animate = () => {
        requestAnimationFrame(animate);
        sphere.rotation.x += 0.02;
        sphere.rotation.y += 0.02;
        renderer.render(scene, camera);
      };
      animate();

      threeScene.current = { scene, camera, renderer, sphere };
    }

    return () => {
      if (threeScene.current) {
        threeScene.current.renderer.dispose();
      }
    };
  }, []);

  return (
    <div
      style={{
        borderRadius: "4px",
        padding: "2em",
        backgroundColor: "red",
        color: "white",
      }}
      data-e2e="APP_2__WIDGET"
    >
      <h2>App 2 Widget - MF-Enhanced</h2>
      <p>
        This is a remote component from App 2. It uses shared libraries for demos.{" "}
        <br />
        Current time: {moment().format("MMMM Do YYYY, h:mm:ss a")}
      </p>

      <div style={{ marginTop: "1em", fontSize: "0.9em" }}>
        <p><strong>Lodash Demo:</strong></p>
        <p>Original: [{sampleData.join(", ")}]</p>
        <p>Shuffled: [{shuffledData.join(", ")}]</p>
        <p>Max: {maxValue}, Min: {minValue}, Avg: {average}</p>
      </div>

      <div style={{
        display: "grid",
        gridTemplateColumns: "1fr 1fr",
        gap: "1em",
        marginTop: "1em"
      }}>
        <div>
          <p><strong>Chart.js Demo:</strong></p>
          <canvas ref={chartRef} style={{ maxWidth: "100%", maxHeight: "120px" }}></canvas>
        </div>

        <div>
          <p><strong>Three.js Demo:</strong></p>
          <canvas ref={threeRef} style={{ border: "1px solid white", maxWidth: "100%" }}></canvas>
        </div>

        <div>
          <p><strong>TanStack Query Demo:</strong></p>
          {isChartLoading ? (
            <p style={{ fontSize: "0.8em" }}>Loading chart data...</p>
          ) : chartData ? (
            <div style={{ fontSize: "0.8em" }}>
              <p>Datasets: {chartData.datasets.length}</p>
              <p>Last fetch: {new Date(chartData.lastFetch).toLocaleTimeString()}</p>
            </div>
          ) : (
            <p style={{ fontSize: "0.8em" }}>No data</p>
          )}
        </div>

        <div>
          {/* Empty cell for 2x2 grid */}
        </div>
      </div>
    </div>
  );
}

// Wrap Widget with QueryClientProvider for standalone usage
export default function WidgetWithQuery() {
  return (
    <QueryClientProvider client={queryClient}>
      <Widget />
    </QueryClientProvider>
  );
}