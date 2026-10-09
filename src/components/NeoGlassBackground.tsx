import React from 'react';

export const NeoGlassBackground: React.FC = () => {
  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden z-0 select-none bg-[#f4f6fb]">
      {/* Soft iridescent gradient mesh background */}
      <div className="absolute inset-0 bg-gradient-to-br from-[#f8f9ff] via-[#f0f4fd] to-[#fbf2f8]" />

      {/* Organic Abstract 3D-like Blob 1 - Warm Soft Peach / Pink (Top Right) */}
      <div
        className="absolute -top-16 -right-16 w-80 h-80 rounded-[50px] opacity-75 blur-2xl transform rotate-12 transition-transform duration-1000"
        style={{
          background: 'linear-gradient(135deg, #fbcfe8 0%, #fed7aa 60%, #f472b6 100%)',
          boxShadow: '0 25px 60px rgba(251, 146, 60, 0.25)',
        }}
      />

      {/* Organic Abstract Blob 2 - Iridescent Lilac / Violet / Blue (Center Left) */}
      <div
        className="absolute top-1/3 -left-20 w-88 h-88 rounded-[60px] opacity-65 blur-3xl transform -rotate-12"
        style={{
          background: 'linear-gradient(135deg, #bfdbfe 0%, #c4b5fd 50%, #f472b6 100%)',
          boxShadow: '0 30px 70px rgba(192, 132, 252, 0.28)',
        }}
      />

      {/* Organic Abstract Blob 3 - Radiant Sky Blue / Cyan (Bottom Right) */}
      <div
        className="absolute -bottom-24 -right-12 w-96 h-96 rounded-[70px] opacity-70 blur-3xl"
        style={{
          background: 'linear-gradient(135deg, #93c5fd 0%, #a5b4fc 50%, #e879f9 100%)',
          boxShadow: '0 35px 80px rgba(96, 165, 250, 0.3)',
        }}
      />

      {/* Organic Abstract Blob 4 - Soft Pastel Rose (Top Left) */}
      <div
        className="absolute top-8 left-12 w-56 h-56 rounded-[45px] opacity-50 blur-2xl transform rotate-45"
        style={{
          background: 'linear-gradient(135deg, #fce7f3 0%, #e0e7ff 100%)',
        }}
      />

      {/* Floating glossy specular beads simulating water drops / gel pills from the reference */}
      <div
        className="absolute top-28 right-8 w-6 h-6 rounded-full opacity-60 backdrop-blur-md"
        style={{
          background: 'linear-gradient(135deg, rgba(255,255,255,0.9), rgba(240,245,255,0.4))',
          boxShadow: '0 8px 16px rgba(160,180,220,0.3), inset 0 2px 3px rgba(255,255,255,0.9)',
          border: '1px solid rgba(255,255,255,0.8)',
        }}
      />
      <div
        className="absolute bottom-36 left-8 w-8 h-8 rounded-full opacity-55 backdrop-blur-md"
        style={{
          background: 'linear-gradient(135deg, rgba(255,255,255,0.9), rgba(254,235,245,0.5))',
          boxShadow: '0 10px 20px rgba(236,72,153,0.2), inset 0 2px 3px rgba(255,255,255,0.9)',
          border: '1px solid rgba(255,255,255,0.8)',
        }}
      />
    </div>
  );
};
