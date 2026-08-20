import type { AppMode } from '../hooks/useMode'

const NAVY = '#1B3A52'

function ImageSlot({ src, alt, height = 160 }: { src: string; alt: string; height?: number }) {
  return (
    <div style={{
      width: '100%', height, borderRadius: 12, overflow: 'hidden',
      background: 'linear-gradient(135deg, rgba(27,58,82,0.6) 0%, rgba(13,34,53,0.8) 100%)',
      position: 'relative', flexShrink: 0,
    }}>
      <img
        src={src} alt={alt}
        style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
        onError={e => {
          const img = e.currentTarget as HTMLImageElement
          img.style.display = 'none'
        }}
      />
    </div>
  )
}

function ModeCard({ icon, title, description, onClick, current, imageSrc }: {
  icon: React.ReactNode
  title: string
  description: string
  onClick: () => void
  current?: boolean
  imageSrc?: string
}) {
  return (
    <button
      onClick={onClick}
      style={{
        width: 280,
        padding: '0 0 24px 0',
        borderRadius: 20,
        border: current
          ? '2px solid rgba(245,182,66,0.7)'
          : '2px solid rgba(255,255,255,0.12)',
        background: current
          ? 'rgba(245,182,66,0.1)'
          : 'rgba(255,255,255,0.06)',
        cursor: 'pointer',
        textAlign: 'left',
        transition: 'all 0.2s',
        display: 'flex',
        flexDirection: 'column',
        gap: 14,
        backdropFilter: 'blur(4px)',
        position: 'relative',
      }}
      onMouseEnter={e => {
        if (!current) {
          e.currentTarget.style.background = 'rgba(255,255,255,0.11)'
          e.currentTarget.style.borderColor = 'rgba(255,255,255,0.28)'
          e.currentTarget.style.transform = 'translateY(-2px)'
        }
      }}
      onMouseLeave={e => {
        if (!current) {
          e.currentTarget.style.background = 'rgba(255,255,255,0.06)'
          e.currentTarget.style.borderColor = 'rgba(255,255,255,0.12)'
          e.currentTarget.style.transform = 'none'
        }
      }}
    >
      {/* Photo */}
      {imageSrc && <ImageSlot src={imageSrc} alt={title} height={150} />}

      {/* Content */}
      <div style={{ padding: '0 22px', display: 'flex', flexDirection: 'column', gap: 12 }}>
        {current && (
          <div style={{
            position: 'absolute', top: 162, right: 14,
            fontSize: '0.6rem', fontWeight: 700,
            letterSpacing: '0.08em', textTransform: 'uppercase',
            color: '#F5B642',
            background: 'rgba(245,182,66,0.15)',
            border: '1px solid rgba(245,182,66,0.35)',
            borderRadius: 999, padding: '2px 8px',
          }}>
            Current
          </div>
        )}
        <div style={{
          width: 44, height: 44,
          borderRadius: 12,
          background: 'rgba(232,112,26,0.15)',
          border: '1px solid rgba(232,112,26,0.3)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: '#F5B642', marginTop: 16,
        }}>
          {icon}
        </div>
        <div>
          <h3 style={{
            fontFamily: "'Plus Jakarta Sans', sans-serif",
            fontWeight: 700, fontSize: '1rem',
            color: '#FFFFFF', marginBottom: 6,
          }}>
            {title}
          </h3>
          <p style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.5)', lineHeight: 1.6 }}>
            {description}
          </p>
        </div>
        <div style={{
          display: 'inline-flex', alignItems: 'center', gap: 5,
          fontSize: '0.73rem', fontWeight: 700,
          color: current ? '#F5B642' : 'rgba(232,112,26,0.8)',
        }}>
          {current ? 'Selected' : 'Select'}
          {!current && (
            <svg width="11" height="11" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
            </svg>
          )}
          {current && (
            <svg width="11" height="11" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
            </svg>
          )}
        </div>
      </div>
    </button>
  )
}

interface Props {
  currentMode: AppMode | null
  onSelect: (mode: AppMode) => void
}

export default function ModeSelector({ currentMode, onSelect }: Props) {
  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 200,
      background: NAVY,
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      padding: 24,
    }}>
      {/* Background image — place mode-bg.jpg in /public/images/ */}
      <div style={{
        position: 'absolute', inset: 0, zIndex: 0,
        backgroundImage: 'url(/images/mode-bg.jpg)',
        backgroundSize: 'cover', backgroundPosition: 'center',
        opacity: 0.18,
      }} />

      {/* Logo + heading */}
      <div style={{ textAlign: 'center', marginBottom: 44, position: 'relative', zIndex: 1 }}>
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          gap: 12, marginBottom: 20,
        }}>
          <h1 style={{
            fontFamily: "'Plus Jakarta Sans', sans-serif",
            fontWeight: 800, fontSize: '1.75rem',
            color: '#FFFFFF', letterSpacing: '-0.02em',
          }}>
            Cohort
          </h1>
        </div>
        <p style={{ color: 'rgba(255,255,255,0.45)', fontSize: '0.9rem' }}>
          {currentMode ? 'Switch your mode' : 'How will you use this tool?'}
        </p>
      </div>

      {/* Cards */}
      <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap', justifyContent: 'center', position: 'relative', zIndex: 1 }}>
        <ModeCard
          current={currentMode === 'patient'}
          imageSrc="/images/patient.jpg"
          icon={
            <svg width="24" height="24" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
            </svg>
          }
          title="I'm a Patient"
          description="Search for trials that match your profile and bookmark ones to discuss with your doctor."
          onClick={() => onSelect('patient')}
        />
        <ModeCard
          current={currentMode === 'doctor'}
          imageSrc="/images/doctor.jpg"
          icon={
            <svg width="24" height="24" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25z" />
            </svg>
          }
          title="I'm a Doctor"
          description="Match patients to trials, save results, and tag each one with the patient you're considering."
          onClick={() => onSelect('doctor')}
        />
        <ModeCard
          current={currentMode === 'researcher'}
          imageSrc="/images/researcher.jpg"
          icon={
            <svg width="24" height="24" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4.26 10.147a60.438 60.438 0 00-.491 6.347A48.62 48.62 0 0112 20.904a48.62 48.62 0 018.232-4.41 60.46 60.46 0 00-.491-6.347m-15.482 0a50.636 50.636 0 00-2.658-.813A59.906 59.906 0 0112 3.493a59.903 59.903 0 0110.399 5.84c-.896.248-1.783.52-2.658.814m-15.482 0A50.717 50.717 0 0112 13.489a50.702 50.702 0 017.74-3.342M6.75 15a.75.75 0 100-1.5.75.75 0 000 1.5zm0 0v-3.675A55.378 55.378 0 0112 8.443m-7.007 11.55A5.981 5.981 0 006.75 15.75v-1.5" />
            </svg>
          }
          title="I'm a Researcher / Student"
          description="Find trial sites near you, discover which conditions are being studied, and get direct contact info for investigators."
          onClick={() => onSelect('researcher')}
        />
      </div>

      <p style={{ marginTop: 40, color: 'rgba(255,255,255,0.7)', fontSize: '0.7rem', position: 'relative', zIndex: 1 }}>
        Saved locally to this browser · No account required · Portfolio project, not for clinical use
      </p>
    </div>
  )
}
