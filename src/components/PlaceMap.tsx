import { memo, useEffect, useRef } from "react";
import { MapContainer, TileLayer, CircleMarker, Popup, useMap } from "react-leaflet";
import type { CircleMarker as LeafletCircleMarker } from "leaflet";
import { KIND_LABEL, directionsUrl, type LatLon } from "@/lib/places";
import type { PlaceView, Selection } from "@/lib/view";

const HAGUE_CENTER: [number, number] = [52.0705, 4.3007];

const STATUS_WORD = { open: "Open then", closed: "Closed then", unknown: "Hours unknown" } as const;

function Recenter({ view, selection }: { view: PlaceView | null; selection: Selection | null }) {
  const map = useMap();
  useEffect(() => {
    if (!view || !selection) return;
    map.setView([view.place.lat, view.place.lon], Math.max(map.getZoom(), 16), { animate: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selection?.token]);
  return null;
}

function AutoResize() {
  const map = useMap();
  useEffect(() => {
    const el = map.getContainer();
    const ro = new ResizeObserver(() => map.invalidateSize());
    ro.observe(el);
    return () => ro.disconnect();
  }, [map]);
  return null;
}

const Markers = memo(function Markers({
  views,
  onSelect,
}: {
  views: PlaceView[];
  onSelect: (id: string) => void;
}) {
  return (
    <>
      {views.map((v) => (
        <CircleMarker
          key={`${v.place.id}-${v.result.status}`}
          center={[v.place.lat, v.place.lon]}
          radius={v.result.status === "open" ? 8 : 6}
          pathOptions={{ className: `marker-${v.result.status}`, weight: 1.5 }}
          eventHandlers={{ click: () => onSelect(v.place.id) }}
        />
      ))}
    </>
  );
});

function SelectedMarker({ view }: { view: PlaceView }) {
  const ref = useRef<LeafletCircleMarker>(null);
  useEffect(() => {
    const t = setTimeout(() => ref.current?.openPopup(), 50);
    return () => clearTimeout(t);
  }, [view.place.id]);
  const { place, result } = view;
  return (
    <CircleMarker
      key={`sel-${place.id}-${result.status}`}
      ref={ref}
      center={[place.lat, place.lon]}
      radius={12}
      pathOptions={{ className: `marker-${result.status} marker-selected` }}
    >
      <Popup>
        <strong style={{ fontSize: 15 }}>{place.name}</strong>
        <br />
        {KIND_LABEL[place.kind]} · {STATUS_WORD[result.status]}
        <br />
        <a href={directionsUrl(place)} target="_blank" rel="noopener noreferrer">
          Directions
        </a>
      </Popup>
    </CircleMarker>
  );
}

export default function PlaceMap({
  views,
  selection,
  onSelect,
  userPos,
}: {
  views: PlaceView[];
  selection: Selection | null;
  onSelect: (id: string) => void;
  userPos: LatLon | null;
}) {
  const selectedView = selection ? (views.find((v) => v.place.id === selection.id) ?? null) : null;

  return (
    <MapContainer
      center={HAGUE_CENTER}
      zoom={13}
      minZoom={11}
      className="night-map h-full w-full"
      scrollWheelZoom
    >
      <TileLayer
        url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">OpenStreetMap</a> contributors'
        maxZoom={19}
      />
      <AutoResize />
      <Markers views={views} onSelect={onSelect} />
      {selectedView && <SelectedMarker view={selectedView} />}
      {/* The user's position is only drawn locally; the map is never moved to it. */}
      {userPos && (
        <CircleMarker
          center={[userPos.lat, userPos.lon]}
          radius={9}
          pathOptions={{ className: "marker-user" }}
          interactive={false}
        />
      )}
      <Recenter view={selectedView} selection={selection} />
    </MapContainer>
  );
}
