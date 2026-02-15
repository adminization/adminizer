import React, { useState, useEffect, useCallback } from "react";
import {
    MapContainer,
    TileLayer,
    Marker,
    Polygon,
    useMap,
    Polyline,
    Rectangle,
    Popup,
} from "react-leaflet";
import L from "leaflet";
import { Button } from "@/components/ui/button.tsx";
import { Hexagon, MapPin, RectangleHorizontal, Trash2, Check } from "lucide-react";

// Fix for default markers
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
    iconRetinaUrl:
        "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png",
    iconUrl:
        "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png",
    shadowUrl:
        "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
});

const polylineStyle = {
    color: "red",
    weight: 5,
    opacity: 1,
    fillOpacity: 0.7,
    dashArray: "0",
};

type Position = [number, number];
type PolygonCoords = Position[];

interface MapFeature {
    id: string | number;
    position?: Position;
    polygon?: PolygonCoords[];
    rectangle?: [Position, Position];
    popupContent?: string;
    color?: string;
    draggable?: boolean;
}

interface GeoJsonEditorProps {
    mode?: "marker" | "polygon" | "rectangle" | "all";
    initialFeatures?: MapFeature[];
    center?: Position;
    zoom?: number;
    showControls?: boolean;
    controlsPosition?: "top-left" | "top-right" | "bottom-left" | "bottom-right";
    onFeaturesChange?: (features: MapFeature[]) => void;
    className?: string;
    style?: React.CSSProperties;
    disabled?: boolean;
    allowMarkerMovement?: boolean;
}

const ControlPanel = ({
                          position,
                          onAddMarker,
                          onAddPolygon,
                          onAddRectangle,
                          onClearAll,
                          onFinishDrawing,
                          drawingMode,
                          drawingInProgress,
                      }: {
    position: string;
    onAddMarker: () => void;
    onAddPolygon: () => void;
    onAddRectangle: () => void;
    onClearAll: () => void;
    onFinishDrawing: () => void;
    drawingMode: string;
    drawingInProgress: boolean;
}) => {
    const positionClass = {
        "top-left": "leaflet-top leaflet-left",
        "top-right": "leaflet-top leaflet-right",
        "bottom-left": "leaflet-bottom leaflet-left",
        "bottom-right": "leaflet-bottom leaflet-right",
    }[position];

    return (
        <div className={`${positionClass} leaflet-control-container`}>
            <div className="leaflet-control leaflet-bar flex flex-col bg-sidebar [&>button]:border-b">
                <Button
                    className={`cursor-pointer rounded-none leaflet-control-button ${
                        drawingMode === "marker" ? "active" : ""
                    }`}
                    variant="ghost"
                    size="sm"
                    onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        onAddMarker();
                    }}
                    title="Add marker"
                    disabled={drawingInProgress}
                >
                    <MapPin />
                </Button>
                <Button
                    className={`cursor-pointer rounded-none leaflet-control-button ${
                        drawingMode === "polygon" ? "active" : ""
                    }`}
                    variant="ghost"
                    size="sm"
                    onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        onAddPolygon();
                    }}
                    title="Add polygon"
                    disabled={drawingInProgress && drawingMode !== "polygon"}
                >
                    <Hexagon />
                </Button>
                <Button
                    className={`cursor-pointer rounded-none leaflet-control-button ${
                        drawingMode === "rectangle" ? "active" : ""
                    }`}
                    variant="ghost"
                    size="sm"
                    onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        onAddRectangle();
                    }}
                    title="Add rectangle"
                    disabled={drawingInProgress}
                >
                    <RectangleHorizontal />
                </Button>
                {drawingMode === "polygon" && drawingInProgress && (
                    <Button
                        className="cursor-pointer rounded-none leaflet-control-button bg-green-500 hover:bg-green-600 text-white"
                        onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            onFinishDrawing();
                        }}
                        variant="ghost"
                        size="sm"
                        title="Finish drawing"
                    >
                        <Check />
                    </Button>
                )}
                <Button
                    className="cursor-pointer rounded-none leaflet-control-button"
                    onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        onClearAll();
                    }}
                    variant="ghost"
                    size="sm"
                    title="Clear map"
                    disabled={drawingInProgress}
                >
                    <Trash2 />
                </Button>
            </div>
        </div>
    );
};

const MapEditor = ({
                       features,
                       mode,
                       drawingMode,
                       setDrawingMode,
                       onFeaturesChange,
                       setDrawingInProgress,
                       onFinishDrawing,
                       allowMarkerMovement = true,
                   }: {
    features: MapFeature[];
    mode: string;
    drawingMode: string;
    setDrawingMode: (mode: "none" | "marker" | "polygon" | "rectangle") => void;
    onFeaturesChange: (features: MapFeature[]) => void;
    setDrawingInProgress: (value: boolean) => void;
    onFinishDrawing: number;
    allowMarkerMovement?: boolean;
}) => {
    const map = useMap();
    const [currentPolygon, setCurrentPolygon] = useState<Position[]>([]);
    const [rectangleStart, setRectangleStart] = useState<Position | null>(null);
    const [rectangleEnd, setRectangleEnd] = useState<Position | null>(null);

    // Marker move handler
    const handleMarkerDragEnd = useCallback((e: L.DragEndEvent, featureId: string | number) => {
        if (!allowMarkerMovement) return;

        const marker = e.target;
        const newPosition = marker.getLatLng();

        const updatedFeatures = features.map(feature => {
            if (feature.id === featureId) {
                return {
                    ...feature,
                    position: [newPosition.lat, newPosition.lng] as Position
                };
            }
            return feature;
        });

        onFeaturesChange(updatedFeatures);
    }, [features, onFeaturesChange, allowMarkerMovement]);

    // Finish drawing the polygon
    const completePolygon = useCallback(() => {
        if (currentPolygon.length < 3) {
            setCurrentPolygon([]);
            setDrawingMode("none");
            setDrawingInProgress(false);
            return;
        }

        const newFeature: MapFeature = {
            id: Date.now(),
            polygon: [[...currentPolygon, currentPolygon[0]]],
            popupContent: `Полигон ${features.length + 1}`,
            color: `#${Math.floor(Math.random() * 16777215).toString(16)}`,
        };

        onFeaturesChange([...features, newFeature]);
        setCurrentPolygon([]);
        setDrawingMode("none");
        setDrawingInProgress(false);
        map.doubleClickZoom.enable();
    }, [
        currentPolygon,
        features,
        onFeaturesChange,
        setDrawingMode,
        map,
        setDrawingInProgress,
    ]);

    // Draw completion handler from parent component
    useEffect(() => {
        if (drawingMode === "polygon" && currentPolygon.length > 0) {
            completePolygon();
        }
    }, [onFinishDrawing, drawingMode, currentPolygon, completePolygon]);

    // Adding a marker
    const addMarker = useCallback(
        (latlng: L.LatLng) => {
            if (drawingMode !== "marker") return;

            const newFeature: MapFeature = {
                id: Date.now(),
                position: [latlng.lat, latlng.lng],
                popupContent: `Маркер ${features.length + 1}`,
                draggable: allowMarkerMovement,
            };
            onFeaturesChange([...features, newFeature]);
        },
        [features, onFeaturesChange, drawingMode, allowMarkerMovement]
    );

    // Adding a polygon point
    const addPolygonPoint = useCallback(
        (latlng: L.LatLng) => {
            if (drawingMode !== "polygon") return;

            const newPoint: Position = [latlng.lat, latlng.lng];
            const updatedPoints = [...currentPolygon, newPoint];
            setCurrentPolygon(updatedPoints);
            setDrawingInProgress(true);
            map.doubleClickZoom.disable();
        },
        [currentPolygon, drawingMode, map, setDrawingInProgress]
    );

    // Start drawing a rectangle
    const startRectangle = useCallback(
        (latlng: L.LatLng) => {
            if (drawingMode !== "rectangle") return;

            const pos: Position = [latlng.lat, latlng.lng];
            setRectangleStart(pos);
            setRectangleEnd(pos);
            setDrawingInProgress(true);
        },
        [drawingMode, setDrawingInProgress]
    );

    // Rectangle update
    const updateRectangle = useCallback(
        (latlng: L.LatLng) => {
            if (!rectangleStart || drawingMode !== "rectangle") return;

            const pos: Position = [latlng.lat, latlng.lng];
            setRectangleEnd(pos);
        },
        [rectangleStart, drawingMode]
    );

    // Finish drawing the rectangle
    const finishRectangle = useCallback(() => {
        if (!rectangleStart || !rectangleEnd) {
            setRectangleStart(null);
            setRectangleEnd(null);
            setDrawingMode("none");
            setDrawingInProgress(false);
            return;
        }

        const newFeature: MapFeature = {
            id: Date.now(),
            rectangle: [rectangleStart, rectangleEnd],
            popupContent: `Прямоугольник ${features.length + 1}`,
            color: `#${Math.floor(Math.random() * 16777215).toString(16)}`,
        };

        onFeaturesChange([...features, newFeature]);
        setRectangleStart(null);
        setRectangleEnd(null);
        setDrawingMode("none");
        setDrawingInProgress(false);
    }, [
        rectangleStart,
        rectangleEnd,
        features,
        onFeaturesChange,
        setDrawingMode,
        setDrawingInProgress,
    ]);

    // Map event handlers
    useEffect(() => {
        const handleClick = (e: L.LeafletMouseEvent) => {
            if (drawingMode === "marker") {
                addMarker(e.latlng);
            } else if (drawingMode === "polygon") {
                addPolygonPoint(e.latlng);
            } else if (drawingMode === "rectangle") {
                if (!rectangleStart) {
                    startRectangle(e.latlng);
                } else {
                    finishRectangle();
                }
            }
        };

        const handleMove = (e: L.LeafletMouseEvent) => {
            if (drawingMode === "rectangle" && rectangleStart) {
                updateRectangle(e.latlng);
            }
        };

        map.on("click", handleClick);
        map.on("mousemove", handleMove);

        return () => {
            map.off("click", handleClick);
            map.off("mousemove", handleMove);
        };
    }, [
        map,
        drawingMode,
        addMarker,
        addPolygonPoint,
        startRectangle,
        updateRectangle,
        finishRectangle,
        rectangleStart,
    ]);

    // Escape key to cancel drawing
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === "Escape") {
                if (currentPolygon.length > 0 || rectangleStart) {
                    setCurrentPolygon([]);
                    setRectangleStart(null);
                    setRectangleEnd(null);
                    setDrawingMode("none");
                    setDrawingInProgress(false);
                    map.doubleClickZoom.enable();
                }
            }
        };

        document.addEventListener("keydown", handleKeyDown);
        return () => {
            document.removeEventListener("keydown", handleKeyDown);
        };
    }, [
        currentPolygon.length,
        rectangleStart,
        setDrawingMode,
        setDrawingInProgress,
        map,
    ]);

    return (
        <>
            {features.map((feature) => (
                <React.Fragment key={feature.id}>
                    {(mode === "marker" || mode === "all") && feature.position && (
                        <Marker
                            position={feature.position}
                            draggable={feature.draggable !== false && allowMarkerMovement}
                            eventHandlers={{
                                dragend: (e) => handleMarkerDragEnd(e, feature.id)
                            }}
                        >
                            <Popup>
                                <div className="text-sm">
                                    <div className="font-semibold">{feature.popupContent}</div>
                                    <div>Широта: {feature.position[0].toFixed(6)}</div>
                                    <div>Долгота: {feature.position[1].toFixed(6)}</div>
                                    {allowMarkerMovement && (
                                        <div className="text-xs text-gray-500 mt-1">
                                            Перетащите для перемещения
                                        </div>
                                    )}
                                </div>
                            </Popup>
                        </Marker>
                    )}

                    {(mode === "polygon" || mode === "all") && feature.polygon && (
                        <Polygon
                            positions={feature.polygon}
                            pathOptions={{ color: feature.color || "blue" }}
                        >
                            <Popup>
                                <div className="text-sm">
                                    <div className="font-semibold">{feature.popupContent}</div>
                                    <div>Точек: {feature.polygon[0].length}</div>
                                </div>
                            </Popup>
                        </Polygon>
                    )}

                    {(mode === "rectangle" || mode === "all") && feature.rectangle && (
                        <Rectangle
                            bounds={feature.rectangle}
                            pathOptions={{ color: feature.color || "green" }}
                        >
                            <Popup>
                                <div className="text-sm">
                                    <div className="font-semibold">{feature.popupContent}</div>
                                    <div>Угол 1: {feature.rectangle[0][0].toFixed(6)}, {feature.rectangle[0][1].toFixed(6)}</div>
                                    <div>Угол 2: {feature.rectangle[1][0].toFixed(6)}, {feature.rectangle[1][1].toFixed(6)}</div>
                                </div>
                            </Popup>
                        </Rectangle>
                    )}
                </React.Fragment>
            ))}

            {/* Current polygon being drawn */}
            {drawingMode === "polygon" && currentPolygon.length > 0 && (
                <>
                    <Polyline
                        positions={currentPolygon}
                        {...polylineStyle}
                    />
                    {currentPolygon.length > 0 && (
                        <Polyline
                            positions={[
                                currentPolygon[currentPolygon.length - 1],
                                currentPolygon[0],
                            ]}
                            {...polylineStyle}
                        />
                    )}
                </>
            )}

            {/* Current rectangle being drawn */}
            {drawingMode === "rectangle" && rectangleStart && rectangleEnd && (
                <Rectangle
                    bounds={[rectangleStart, rectangleEnd]}
                    pathOptions={{ color: "red", fillOpacity: 0.3, weight: 3 }}
                />
            )}
        </>
    );
};

const GeoJsonEditor: React.FC<GeoJsonEditorProps> = ({
                                                         mode = "all",
                                                         initialFeatures = [],
                                                         center = [45.7, 60.1],
                                                         zoom = 3,
                                                         showControls = true,
                                                         controlsPosition = "top-right",
                                                         onFeaturesChange,
                                                         className,
                                                         style,
                                                         disabled,
                                                         allowMarkerMovement = true,
                                                     }) => {
    const [features, setFeatures] = useState<MapFeature[]>(initialFeatures);
    const [drawingMode, setDrawingMode] = useState<
        "none" | "marker" | "polygon" | "rectangle"
    >("none");
    const [drawingInProgress, setDrawingInProgress] = useState(false);
    const [finishDrawingTrigger, setFinishDrawingTrigger] = useState(0);

    const handleFeaturesChange = useCallback(
        (newFeatures: MapFeature[]) => {
            setFeatures(newFeatures);
            if (onFeaturesChange) {
                onFeaturesChange(newFeatures);
            }
        },
        [onFeaturesChange]
    );

    const toggleDrawingMode = useCallback(
        (mode: "marker" | "polygon" | "rectangle" | "none") => {
            if (drawingInProgress) return;
            setDrawingMode((prev) => (prev === mode ? "none" : mode));
        },
        [drawingInProgress]
    );

    const handleFinishDrawing = useCallback(() => {
        if (drawingMode === "polygon" && drawingInProgress) {
            setFinishDrawingTrigger(prev => prev + 1);
        }
    }, [drawingMode, drawingInProgress]);

    const handleClearAll = useCallback(() => {
        if (drawingInProgress) return;
        handleFeaturesChange([]);
        setDrawingMode("none");
    }, [handleFeaturesChange, drawingInProgress]);

    // Update features when initialFeatures change
    useEffect(() => {
        if (JSON.stringify(initialFeatures) !== JSON.stringify(features)) {
            setFeatures(initialFeatures);
        }
    }, [initialFeatures]);

    return (
        <div className={`${className} ${disabled ? "pointer-events-none opacity-50" : ""}`} style={{ position: "relative", ...style }}>
            <MapContainer
                center={center}
                zoom={zoom}
                style={{ height: "500px", width: "100%" }}
                doubleClickZoom={true}
            >
                <TileLayer
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                />
                <MapEditor
                    features={features}
                    mode={mode}
                    drawingMode={drawingMode}
                    setDrawingMode={setDrawingMode}
                    onFeaturesChange={handleFeaturesChange}
                    setDrawingInProgress={setDrawingInProgress}
                    onFinishDrawing={finishDrawingTrigger}
                    allowMarkerMovement={allowMarkerMovement && !disabled}
                />
            </MapContainer>
            {showControls && (
                <ControlPanel
                    position={controlsPosition}
                    onAddMarker={() => toggleDrawingMode("marker")}
                    onAddPolygon={() => toggleDrawingMode("polygon")}
                    onAddRectangle={() => toggleDrawingMode("rectangle")}
                    onClearAll={handleClearAll}
                    onFinishDrawing={handleFinishDrawing}
                    drawingMode={drawingMode}
                    drawingInProgress={drawingInProgress}
                />
            )}
            {drawingMode === "polygon" && (
                <div
                    style={{
                        position: "absolute",
                        bottom: "20px",
                        left: "50%",
                        transform: "translateX(-50%)",
                        backgroundColor: "white",
                        padding: "10px",
                        borderRadius: "5px",
                        fontSize: '14px',
                        boxShadow: "0 0 10px rgba(0,0,0,0.2)",
                        zIndex: 410,
                    }}
                >
                    {drawingInProgress
                        ? "Добавьте точки полигона на карте, затем нажмите 'Готово'"
                        : "Добавьте первую точку полигона на карте"}
                </div>
            )}

            {drawingMode === "rectangle" && (
                <div
                    style={{
                        position: "absolute",
                        bottom: "20px",
                        left: "50%",
                        transform: "translateX(-50%)",
                        backgroundColor: "white",
                        padding: "10px",
                        borderRadius: "5px",
                        fontSize: '14px',
                        boxShadow: "0 0 10px rgba(0,0,0,0.2)",
                        zIndex: 410,
                    }}
                >
                    {drawingInProgress
                        ? "Кликните для завершения рисования прямоугольника"
                        : "Кликните для начала рисования прямоугольника"}
                </div>
            )}

            {drawingMode === "marker" && (
                <div
                    style={{
                        position: "absolute",
                        bottom: "20px",
                        left: "50%",
                        transform: "translateX(-50%)",
                        backgroundColor: "white",
                        padding: "10px",
                        borderRadius: "5px",
                        fontSize: '14px',
                        boxShadow: "0 0 10px rgba(0,0,0,0.2)",
                        zIndex: 1000,
                    }}
                >
                    {allowMarkerMovement
                        ? "Кликните для добавления маркера. Перетащите маркер для перемещения. Кликните еще раз на маркер справа в углу, чтобы завершить рисование"
                        : "Кликните для добавления маркера"}
                </div>
            )}
        </div>
    );
};

export default GeoJsonEditor;