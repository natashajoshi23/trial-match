import { useEffect, useRef } from 'react'
import type { TrialSiteResult } from '../types'
import 'leaflet/dist/leaflet.css'

interface Props {
  trials: TrialSiteResult[]
  patientLat: number | null
  patientLon: number | null
}

export default function MapView({ trials, patientLat, patientLon }: Props) {
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<L.Map | null>(null)

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return

    import('leaflet').then(L => {
      if (!containerRef.current || mapRef.current) return

      const defaultCenter: [number, number] = patientLat != null && patientLon != null
        ? [patientLat, patientLon]
        : [39.5, -98.35]

      const map = L.map(containerRef.current, {
        center: defaultCenter,
        zoom: patientLat != null ? 8 : 4,
        zoomControl: true,
        scrollWheelZoom: false,
      })
      mapRef.current = map

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
        maxZoom: 18,
      }).addTo(map)

      // Patient location marker (blue dot)
      if (patientLat != null && patientLon != null) {
        const youIcon = L.divIcon({
          className: '',
          html: `<div style="width:14px;height:14px;background:#3B82F6;border:3px solid white;border-radius:50%;box-shadow:0 2px 6px rgba(59,130,246,0.5)"></div>`,
          iconSize: [14, 14],
          iconAnchor: [7, 7],
        })
        L.marker([patientLat, patientLon], { icon: youIcon })
          .addTo(map)
          .bindPopup('<strong>Your location</strong>')
      }

      // Trial site markers
      const withCoords = trials.filter(t => t.nearest_lat != null && t.nearest_lon != null)
      const bounds: [number, number][] = []

      withCoords.forEach(trial => {
        const lat = trial.nearest_lat!
        const lon = trial.nearest_lon!
        bounds.push([lat, lon])

        const statusColor = (() => {
          const s = (trial.overall_status ?? '').toUpperCase()
          if (s === 'RECRUITING') return '#22C55E'
          if (s === 'NOT_YET_RECRUITING') return '#F59E0B'
          return '#9CA3AF'
        })()

        const icon = L.divIcon({
          className: '',
          html: `<div style="width:12px;height:12px;background:${statusColor};border:2.5px solid white;border-radius:50%;box-shadow:0 2px 5px rgba(0,0,0,0.3)"></div>`,
          iconSize: [12, 12],
          iconAnchor: [6, 6],
        })

        const phases = trial.phases.map(p => p.replace('PHASE', 'Ph ')).join(' / ')
        const loc = [trial.nearest_city, trial.nearest_state].filter(Boolean).join(', ')
        const dist = trial.nearest_distance_miles != null ? ` · ${trial.nearest_distance_miles} mi` : ''

        L.marker([lat, lon], { icon })
          .addTo(map)
          .bindPopup(`
            <div style="font-family:'Plus Jakarta Sans',sans-serif;max-width:220px">
              <p style="font-weight:700;font-size:0.8rem;color:#1B3A52;margin:0 0 4px">${trial.brief_title}</p>
              ${phases ? `<p style="font-size:0.7rem;color:#6B7280;margin:0 0 2px">${phases}</p>` : ''}
              ${loc ? `<p style="font-size:0.7rem;color:#6B7280;margin:0">${loc}${dist}</p>` : ''}
              <a href="https://clinicaltrials.gov/study/${trial.nct_id}" target="_blank"
                 style="font-size:0.68rem;color:#1B3A52;font-weight:700;text-decoration:none;display:block;margin-top:6px">
                View on ClinicalTrials.gov →
              </a>
            </div>
          `, { maxWidth: 240 })
      })

      if (bounds.length > 0) {
        const allBounds = patientLat != null && patientLon != null
          ? [[patientLat, patientLon] as [number, number], ...bounds]
          : bounds
        map.fitBounds(allBounds as L.LatLngBoundsExpression, { padding: [40, 40] })
      }
    })

    return () => {
      if (mapRef.current) {
        mapRef.current.remove()
        mapRef.current = null
      }
    }
  }, [])

  const recruiting = trials.filter(t => (t.overall_status ?? '').toUpperCase() === 'RECRUITING').length
  const opening = trials.filter(t => (t.overall_status ?? '').toUpperCase() === 'NOT_YET_RECRUITING').length
  const mapped = trials.filter(t => t.nearest_lat != null).length

  return (
    <div style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
      {/* Legend + stats */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap',
        marginBottom: 10, fontSize: '0.72rem', color: '#4A6070',
      }}>
        <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
          <span style={{ width: 10, height: 10, borderRadius: '50%', background: '#22C55E', display: 'inline-block', border: '2px solid white', boxShadow: '0 1px 3px rgba(0,0,0,0.3)' }} />
          Recruiting ({recruiting})
        </span>
        <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
          <span style={{ width: 10, height: 10, borderRadius: '50%', background: '#F59E0B', display: 'inline-block', border: '2px solid white', boxShadow: '0 1px 3px rgba(0,0,0,0.3)' }} />
          Opening soon ({opening})
        </span>
        {patientLat != null && (
          <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
            <span style={{ width: 10, height: 10, borderRadius: '50%', background: '#3B82F6', display: 'inline-block', border: '2px solid white', boxShadow: '0 1px 3px rgba(59,130,246,0.4)' }} />
            Your location
          </span>
        )}
        <span style={{ marginLeft: 'auto', color: '#B0BEC5' }}>{mapped} of {trials.length} sites mapped</span>
      </div>

      {/* Map container */}
      <div
        ref={containerRef}
        style={{
          width: '100%', height: 480, borderRadius: 14,
          border: '1.5px solid #E2D9C8',
          overflow: 'hidden',
          background: '#F5F5F0',
        }}
      />
      <p style={{ fontSize: '0.62rem', color: '#C0CAD4', marginTop: 6, textAlign: 'right' }}>
        Map data © OpenStreetMap contributors · Click a pin for trial details
      </p>
    </div>
  )
}
