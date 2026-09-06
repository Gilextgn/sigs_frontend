import { useEffect, useState } from 'react';
import { StarField } from './StarField';

interface LoginCarouselProps {
  images: string[];
  intervalMs?: number;
}

/**
 * Défilement plein écran de max 5 images (voir public/images/login-carousel/README.md
 * pour déposer tes propres photos), avec un voile de couleur (encre bleu) par-dessus
 * pour garder le formulaire lisible quelle que soit l'image affichée, et un léger
 * champ d'étoiles scintillantes pour donner du mouvement à l'ensemble.
 */
export function LoginCarousel({ images, intervalMs = 6000 }: LoginCarouselProps) {
  const [activeIndex, setActiveIndex] = useState(0);
  const slides = images.slice(0, 5);

  useEffect(() => {
    if (slides.length <= 1) return;
    const timer = setInterval(() => {
      setActiveIndex((current) => (current + 1) % slides.length);
    }, intervalMs);
    return () => clearInterval(timer);
  }, [slides.length, intervalMs]);

  return (
    <div className="absolute inset-0 overflow-hidden bg-primary-dark">
      {slides.map((src, index) => (
        <div
          key={src}
          className="absolute inset-0 bg-cover bg-center transition-opacity duration-[1500ms] ease-in-out"
          style={{
            backgroundImage: `url(${src})`,
            opacity: index === activeIndex ? 1 : 0,
          }}
          aria-hidden={index !== activeIndex}
        />
      ))}

      {/* Voile de couleur (encre bleu) qui masque légèrement les images pour la lisibilité */}
      <div
        className="absolute inset-0"
        style={{
          background:
            'linear-gradient(160deg, rgba(6,11,22,0.92) 0%, rgba(15,30,60,0.78) 45%, rgba(31,61,107,0.6) 100%)',
        }}
      />

      <StarField density={110} />

      {slides.length > 1 && (
        <div className="absolute bottom-8 left-1/2 flex -translate-x-1/2 gap-2">
          {slides.map((src, index) => (
            <button
              key={src}
              type="button"
              aria-label={`Image ${index + 1}`}
              onClick={() => setActiveIndex(index)}
              className="h-1.5 rounded-full transition-all"
              style={{
                width: index === activeIndex ? '24px' : '8px',
                background: index === activeIndex ? '#FFFFFF' : 'rgba(255,255,255,0.4)',
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
}
