import React, { useState, useEffect, useCallback, useRef } from "react";
import { Plus, X, Unlink } from "lucide-react";

const getRandomColor = () => {
  const letters = "0123456789ABCDEF";
  let color = "#";
  for (let i = 0; i < 6; i++) {
    color += letters[Math.floor(Math.random() * 16)];
  }
  return color;
};

const initialCurve = {
  startX: 50,
  startY: 200,
  control1X: 100,
  control1Y: 50,
  control2X: 200,
  control2Y: 50,
  endX: 250,
  endY: 200,
  color: getRandomColor(),
  startConnected: null,
  endConnected: null,
};

const BezierCurvePainter = () => {
  const [curves, setCurves] = useState([initialCurve]);
  const [transparent, setTransparent] = useState(false);
  const [blackline, setBlackline] = useState(false);
  const [canvasSize, setCanvasSize] = useState({ width: 0, height: 0 });
  const [dragging, setDragging] = useState(null);
  const [exportUrl, setExportUrl] = useState("");
  const canvasRef = useRef(null);

  const handleCheckboxChange = (event) => {
    setTransparent(event.target.checked);
  };

  const handleCheckboxChange2 = (event) => {
    setBlackline(event.target.checked);
  };

  const updatePoint = (curveIndex, key, value) => {
    setCurves((prevCurves) => {
      const newCurves = [...prevCurves];
      newCurves[curveIndex] = {
        ...newCurves[curveIndex],
        [key]: parseInt(value),
      };

      // If the updated point is connected, update the connected point as well
      const updatedCurve = newCurves[curveIndex];
      const connectedPointType = key.startsWith("start")
        ? "startConnected"
        : "endConnected";
      const connectedCurveIndex = updatedCurve[connectedPointType];

      if (connectedCurveIndex !== null) {
        const connectedPointKey = key.startsWith("start") ? "end" : "start";
        newCurves[connectedCurveIndex] = {
          ...newCurves[connectedCurveIndex],
          [`${connectedPointKey}${key.slice(-1)}`]: parseInt(value),
        };
      }

      return newCurves;
    });
  };

  const addCurve = () => {
    setCurves((prevCurves) => [
      ...prevCurves,
      { ...initialCurve, color: getRandomColor() },
    ]);
  };

  const removeCurve = (index) => {
    setCurves((prevCurves) => {
      const newCurves = prevCurves.filter((_, i) => i !== index);
      // Update connections after removing a curve
      return newCurves.map((curve) => ({
        ...curve,
        startConnected:
          curve.startConnected === index
            ? null
            : curve.startConnected > index
            ? curve.startConnected - 1
            : curve.startConnected,
        endConnected:
          curve.endConnected === index
            ? null
            : curve.endConnected > index
            ? curve.endConnected - 1
            : curve.endConnected,
      }));
    });
  };

  const drawCurve = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    curves.forEach((curve) => {
      // Draw control points
      const pointRadius = 6;

      const drawPoint = (x, y, isConnected) => {
        ctx.beginPath();
        ctx.arc(x, y, pointRadius, 0, 2 * Math.PI);
        ctx.fillStyle = transparent
          ? "transparent"
          : isConnected
          ? "lightgreen"
          : "lightgray";
        ctx.fill();
        ctx.strokeStyle = transparent ? "transparent" : "darkgray";
        ctx.stroke();
      };

      drawPoint(curve.startX, curve.startY, curve.startConnected !== null);
      drawPoint(curve.control1X, curve.control1Y, false);
      drawPoint(curve.control2X, curve.control2Y, false);
      drawPoint(curve.endX, curve.endY, curve.endConnected !== null);

      // Draw lines connecting control points
      ctx.beginPath();
      ctx.moveTo(curve.startX, curve.startY);
      ctx.lineTo(curve.control1X, curve.control1Y);
      ctx.lineTo(curve.control2X, curve.control2Y);
      ctx.lineTo(curve.endX, curve.endY);
      ctx.strokeStyle = transparent ? "transparent" : "lightgray";
      ctx.stroke();

      // Draw Bezier curve
      ctx.beginPath();
      ctx.moveTo(curve.startX, curve.startY);
      ctx.bezierCurveTo(
        curve.control1X,
        curve.control1Y,
        curve.control2X,
        curve.control2Y,
        curve.endX,
        curve.endY
      );
      ctx.strokeStyle = blackline ? "black" : curve.color;
      ctx.lineWidth = 2;
      ctx.stroke();
    });
  }, [curves, transparent, blackline]);

  const loadFromUrl = () => {
    const urlParams = new URLSearchParams(window.location.search);
    const data = urlParams.get("curves");
    if (data) {
      const parsedData = JSON.parse(decodeURIComponent(data));
      const parsedCurves = parsedData.map((curve) => ({
        startX: curve[0],
        startY: curve[1],
        control1X: curve[2],
        control1Y: curve[3],
        control2X: curve[4],
        control2Y: curve[5],
        endX: curve[6],
        endY: curve[7],
        color: curve[8],
        startConnected: curve[9],
        endConnected: curve[10],
      }));
      setCurves(parsedCurves);
    }
  };

  const genExportUrl = () => {
    const data = curves.map((curve) => [
      curve.startX,
      curve.startY,
      curve.control1X,
      curve.control1Y,
      curve.control2X,
      curve.control2Y,
      curve.endX,
      curve.endY,
      curve.color,
      curve.startConnected,
      curve.endConnected,
    ]);
    const dataStr = JSON.stringify(data);
    const url = `${window.location.origin}${
      window.location.pathname
    }?curves=${encodeURIComponent(dataStr)}`;
    return url;
  };

  useEffect(() => {
    loadFromUrl();
    const updateCanvasSize = () => {
      const container = document.getElementById("canvasContainer");
      if (container) {
        setCanvasSize({
          width: container.clientWidth,
          height: container.clientHeight,
        });
      }
    };

    window.addEventListener("resize", updateCanvasSize);
    updateCanvasSize();

    return () => window.removeEventListener("resize", updateCanvasSize);
  }, []);

  useEffect(() => {
    drawCurve();
  }, [curves, canvasSize, drawCurve]);

  useEffect(() => {
    setExportUrl(genExportUrl());
  }, [curves]);

  const handleMouseDown = (e) => {
    const rect = canvasRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    curves.forEach((curve, curveIndex) => {
      ["start", "control1", "control2", "end"].forEach((baseKey) => {
        const pointX = curve[`${baseKey}X`];
        const pointY = curve[`${baseKey}Y`];
        const distance = Math.sqrt((x - pointX) ** 2 + (y - pointY) ** 2);
        if (distance <= 6) {
          setDragging({ curveIndex, baseKey });
        }
      });
    });
  };

  const handleMouseMove = (e) => {
    if (!dragging) return;

    const rect = canvasRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    setCurves((prevCurves) => {
      const newCurves = [...prevCurves];
      const { curveIndex, baseKey } = dragging;
      newCurves[curveIndex] = {
        ...newCurves[curveIndex],
        [`${baseKey}X`]: x,
        [`${baseKey}Y`]: y,
      };

      // If the dragged point is connected, update the connected point as well
      const draggedCurve = newCurves[curveIndex];
      const connectedPointType =
        baseKey === "start" ? "startConnected" : "endConnected";
      const connectedCurveIndex = draggedCurve[connectedPointType];

      if (connectedCurveIndex !== null) {
        const connectedPointKey = baseKey === "start" ? "end" : "start";
        newCurves[connectedCurveIndex] = {
          ...newCurves[connectedCurveIndex],
          [`${connectedPointKey}X`]: x,
          [`${connectedPointKey}Y`]: y,
        };
      }

      return newCurves;
    });
  };

  const handleMouseUp = () => {
    if (!dragging) return;

    const { curveIndex, baseKey } = dragging;
    const currentCurve = curves[curveIndex];
    const currentX = currentCurve[`${baseKey}X`];
    const currentY = currentCurve[`${baseKey}Y`];

    let connected = false;

    setCurves((prevCurves) => {
      return prevCurves.map((curve, i) => {
        if (i === curveIndex) return curve;

        const checkConnection = (endPoint) => {
          const distance = Math.sqrt(
            (currentX - curve[`${endPoint}X`]) ** 2 +
              (currentY - curve[`${endPoint}Y`]) ** 2
          );

          if (distance <= 10) {
            connected = true;
            return {
              ...curve,
              [`${endPoint}Connected`]: curveIndex,
              [`${endPoint}X`]: currentX,
              [`${endPoint}Y`]: currentY,
            };
          }
          return curve;
        };

        return checkConnection("start") || checkConnection("end");
      });
    });

    if (connected) {
      setCurves((prevCurves) => {
        const newCurves = [...prevCurves];
        newCurves[curveIndex] = {
          ...newCurves[curveIndex],
          [`${baseKey}Connected`]: true,
        };
        return newCurves;
      });
    }

    setDragging(null);
  };

  const disconnectPoint = (curveIndex, pointType) => {
    setCurves((prevCurves) => {
      const newCurves = [...prevCurves];
      const connectedCurveIndex =
        newCurves[curveIndex][`${pointType}Connected`];

      if (connectedCurveIndex !== null) {
        // Disconnect the other curve as well
        const otherPointType =
          newCurves[connectedCurveIndex].startConnected === curveIndex
            ? "start"
            : "end";
        newCurves[connectedCurveIndex] = {
          ...newCurves[connectedCurveIndex],
          [`${otherPointType}Connected`]: null,
        };
      }

      newCurves[curveIndex] = {
        ...newCurves[curveIndex],
        [`${pointType}Connected`]: null,
      };

      return newCurves;
    });
  };

  return (
    <div className="flex h-screen">
      <div className="w-1/5 p-4 overflow-y-auto bg-gray-100">
        <h2 className="text-2xl font-bold mb-4">Spline</h2>
        <label className="p-1">
          Hide
          <input
            type="checkbox"
            checked={transparent}
            onChange={handleCheckboxChange}
          />
        </label>
        <label className="p-1">
          Black Line
          <input
            type="checkbox"
            checked={blackline}
            onChange={handleCheckboxChange2}
          />
        </label>
        {curves.map((curve, index) => (
          <div key={index} className="mb-4 p-2 bg-white rounded shadow">
            <div className="flex justify-between items-center mb-2">
              <span className="font-semibold">Curve {index + 1}</span>
              <button
                onClick={() => removeCurve(index)}
                className="text-red-500"
              >
                <X size={16} />
              </button>
            </div>
            {["start", "control1", "control2", "end"].map((baseKey) => (
              <div key={baseKey} className="mb-2">
                <div className="flex justify-between items-center">
                  <span className="font-medium">{baseKey}:</span>
                  {(baseKey === "start" || baseKey === "end") &&
                    curve[`${baseKey}Connected`] !== null && (
                      <button
                        onClick={() => disconnectPoint(index, baseKey)}
                        className="text-blue-500"
                      >
                        <Unlink size={16} />
                      </button>
                    )}
                </div>
                <div className="flex space-x-2">
                  <input
                    type="number"
                    value={curve[`${baseKey}X`]}
                    onChange={(e) =>
                      updatePoint(index, `${baseKey}X`, e.target.value)
                    }
                    className="w-1/2 mt-1 block rounded-md border-gray-300 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50"
                  />
                  <input
                    type="number"
                    value={curve[`${baseKey}Y`]}
                    onChange={(e) =>
                      updatePoint(index, `${baseKey}Y`, e.target.value)
                    }
                    className="w-1/2 mt-1 block rounded-md border-gray-300 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50"
                  />
                </div>
              </div>
            ))}
          </div>
        ))}
        <button
          onClick={addCurve}
          className="w-full bg-blue-500 text-white py-2 rounded hover:bg-blue-600 transition-colors"
        >
          <Plus className="inline mr-2" size={16} />
          Add Curve
        </button>
        <p className="whitespace-nowrap overflow-hidden text-ellipsis select-all">
          {exportUrl}
        </p>
      </div>
      <div id="canvasContainer" className="w-4/5 h-full">
        <canvas
          ref={canvasRef}
          width={canvasSize.width}
          height={canvasSize.height}
          className="border border-gray-300"
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
        ></canvas>
      </div>
    </div>
  );
};

export default BezierCurvePainter;
