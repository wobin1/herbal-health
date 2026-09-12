'use client';

import { useState } from 'react';
import Image from 'next/image';

const CREDENTIALS = ['Naturopathic Doctor', 'Master Herbalist', 'Certified Nutritionist'];

export function FounderBioSection({
  title,
  body,
  imageSrc,
  imageAlt,
  missionText,
}: {
  title: string;
  body: string;
  imageSrc: string;
  imageAlt: string;
  missionText?: string;
}) {
  const paragraphs = body.split(/\n{2,}/).filter(Boolean);
  const missionParagraphs = missionText?.split(/\n{2,}/).filter(Boolean) ?? [];
  const hasMission = missionParagraphs.length > 0;
  const [activeTab, setActiveTab] = useState<'biography' | 'mission'>('biography');
  const [expanded, setExpanded] = useState(false);

  return (
    <article className="bg-primary-950">
      <div className="relative mx-auto min-h-[560px] max-w-6xl overflow-hidden lg:min-h-[680px]">
        <span
          aria-hidden
          className="font-serif pointer-events-none absolute -bottom-10 left-0 select-none text-[22vw] font-black leading-none tracking-tight text-neutral-50/5 lg:-bottom-16 lg:text-[9rem]"
        >
          Herbal
        </span>

        <div className="relative flex h-full flex-col-reverse lg:grid lg:grid-cols-2">
          <div className="relative mx-auto h-[360px] w-full max-w-md lg:h-full lg:max-w-none">
            <Image
              src={imageSrc}
              alt={imageAlt}
              fill
              priority
              className="object-contain object-bottom saturate-[0.85] sepia-[0.12] lg:object-cover lg:object-[center_top]"
            />
            <div
              aria-hidden
              className="from-primary-950/40 pointer-events-none absolute inset-0 bg-gradient-to-t via-transparent to-transparent lg:bg-gradient-to-r lg:from-transparent lg:via-transparent lg:to-primary-950/10"
            />
          </div>

          <div className="flex flex-col px-6 pb-10 pt-10 text-neutral-50 sm:px-10 lg:justify-center lg:px-16 lg:py-16">
            <div className="mb-10 flex items-center justify-between">
              <span className="font-serif text-lg tracking-tight">Herbal Health</span>
              <nav aria-label="Founder page sections" className="hidden gap-8 text-xs font-semibold uppercase tracking-[0.15em] sm:flex">
                <button
                  type="button"
                  onClick={() => {
                    setActiveTab('biography');
                    setExpanded(false);
                  }}
                  className={`pb-1 transition-colors ${
                    activeTab === 'biography'
                      ? 'text-accent-500 border-accent-500 border-b'
                      : 'border-b border-transparent text-neutral-50/45 hover:text-neutral-50/80'
                  }`}
                >
                  Biography
                </button>
                {hasMission && (
                  <button
                    type="button"
                    onClick={() => {
                      setActiveTab('mission');
                      setExpanded(false);
                    }}
                    className={`pb-1 transition-colors ${
                      activeTab === 'mission'
                        ? 'text-accent-500 border-accent-500 border-b'
                        : 'border-b border-transparent text-neutral-50/45 hover:text-neutral-50/80'
                    }`}
                  >
                    Mission
                  </button>
                )}
              </nav>
            </div>

            <span className="border-accent-500 text-accent-500 mb-5 inline-block w-fit rounded-full border px-4 py-1 text-xs font-semibold uppercase tracking-[0.15em]">
              Our Founder
            </span>
            <h1 className="font-serif text-4xl font-semibold tracking-tight text-neutral-50 sm:text-5xl">
              {title}
            </h1>

            <ul className="mt-5 flex flex-wrap gap-2">
              {CREDENTIALS.map((credential) => (
                <li
                  key={credential}
                  className="rounded-full bg-neutral-50/8 px-3 py-1 text-xs font-medium text-neutral-50/70"
                >
                  {credential}
                </li>
              ))}
            </ul>

            <div
              className={`border-accent-500/50 relative mt-8 max-w-[62ch] space-y-4 border-l pl-6 text-[0.95rem] leading-[1.8] text-neutral-50/80 ${
                expanded ? '' : 'max-h-[360px] overflow-hidden'
              }`}
            >
              {activeTab === 'biography'
                ? paragraphs.map((paragraph, index) => <p key={index}>{paragraph}</p>)
                : missionParagraphs.map((paragraph, index) => <p key={index}>{paragraph}</p>)}
              {!expanded && (
                <div
                  aria-hidden
                  className="from-primary-950 pointer-events-none absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t to-transparent"
                />
              )}
            </div>
            {(activeTab === 'biography' ? paragraphs : missionParagraphs).length > 0 && (
              <button
                type="button"
                onClick={() => setExpanded((prev) => !prev)}
                className="text-accent-500 mt-3 w-fit pl-6 text-left text-xs font-semibold uppercase tracking-[0.15em] hover:underline"
              >
                {expanded ? 'See less' : 'See more'}
              </button>
            )}
          </div>
        </div>
      </div>
    </article>
  );
}
