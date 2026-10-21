"use client";

import Box from "@mui/material/Box";
import { useEffect, useRef } from "react";
import * as THREE from "three";
import { usePalette } from "@/theme/usePalette";

interface Props {
  from: string;
  to: string;
  flips: number; // increments on every flip: the coins trade places
  settles: number; // increments on every completed swap: the coins spin once
}

function faceTexture(symbol: string, bg: string, fg: string) {
  const c = document.createElement("canvas");
  c.width = c.height = 256;
  const g = c.getContext("2d")!;
  g.fillStyle = bg;
  g.fillRect(0, 0, 256, 256);
  g.strokeStyle = fg;
  g.globalAlpha = 0.35;
  g.lineWidth = 6;
  g.beginPath();
  g.arc(128, 128, 108, 0, Math.PI * 2);
  g.stroke();
  g.globalAlpha = 1;
  g.fillStyle = fg;
  g.font = `700 ${symbol.length > 3 ? 64 : 84}px system-ui, sans-serif`;
  g.textAlign = "center";
  g.textBaseline = "middle";
  g.fillText(symbol, 128, 138);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

// Two coins orbit each other. Flipping trades their places; a settled swap spins them.
// Motion tells the user a state changed, so it is the only animation on the page.
export function SwapOrb({ from, to, flips, settles }: Props) {
  const p = usePalette();
  const host = useRef<HTMLDivElement>(null);
  const target = useRef({ orbit: 0, spin: 0 });
  const redraw = useRef<() => void>(() => {});
  const texts = useRef({ from, to });

  useEffect(() => {
    texts.current = { from, to };
    redraw.current();
  }, [from, to]);
  useEffect(() => {
    target.current.orbit = flips * Math.PI;
    redraw.current();
  }, [flips]);
  useEffect(() => {
    if (settles > 0) target.current.spin += Math.PI * 2;
    redraw.current();
  }, [settles]);

  useEffect(() => {
    const el = host.current;
    if (!el) return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    el.appendChild(renderer.domElement);
    renderer.domElement.setAttribute("aria-hidden", "true");

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(35, 1, 0.1, 50);
    camera.position.set(0, 0, 7);
    scene.add(new THREE.AmbientLight(0xffffff, 1.6));
    const key = new THREE.DirectionalLight(0xffffff, 2.2);
    key.position.set(2, 3, 5);
    scene.add(key);

    const pair = new THREE.Group();
    scene.add(pair);
    const bodyGeo = new THREE.CylinderGeometry(1, 1, 0.2, 64);
    const faceGeo = new THREE.CircleGeometry(0.97, 64);
    const disposables: { dispose: () => void }[] = [bodyGeo, faceGeo];

    const makeCoin = (x: number, bg: string, fg: string, symbol: string) => {
      const coin = new THREE.Group();
      coin.position.x = x;
      const bodyMat = new THREE.MeshStandardMaterial({ color: bg, metalness: 0.35, roughness: 0.45 });
      const body = new THREE.Mesh(bodyGeo, bodyMat);
      body.rotation.x = Math.PI / 2;
      const tex = faceTexture(symbol, bg, fg);
      const faceMat = new THREE.MeshBasicMaterial({ map: tex });
      const front = new THREE.Mesh(faceGeo, faceMat);
      front.position.z = 0.101;
      const back = front.clone();
      back.position.z = -0.101;
      back.rotation.y = Math.PI;
      coin.add(body, front, back);
      pair.add(coin);
      disposables.push(bodyMat, faceMat, tex);
      return { coin, faceMat };
    };

    const a = makeCoin(-1.5, p.primary.main, p.primary.contrastText, texts.current.from);
    const b = makeCoin(1.5, p.text.secondary, p.background.paper, texts.current.to);

    const state = { orbit: 0, spin: 0 };
    let raf = 0;
    let visible = true;
    let lastFrom = "";
    let lastTo = "";

    const frame = (t: number) => {
      raf = 0;
      const tg = target.current;
      const k = reduced ? 1 : 0.1;
      state.orbit += (tg.orbit - state.orbit) * k;
      state.spin += (tg.spin - state.spin) * k;
      pair.rotation.y = state.orbit;
      // coins keep facing the camera while their pair turns
      a.coin.rotation.y = -state.orbit + state.spin;
      b.coin.rotation.y = -state.orbit + state.spin;
      const bob = reduced ? 0 : Math.sin(t / 900) * 0.06;
      a.coin.position.y = bob;
      b.coin.position.y = -bob;

      if (texts.current.from !== lastFrom || texts.current.to !== lastTo) {
        lastFrom = texts.current.from;
        lastTo = texts.current.to;
        // the coin on the left always shows what you pay with
        const swapped = Math.round(tg.orbit / Math.PI) % 2 !== 0;
        const left = swapped ? b : a;
        const right = swapped ? a : b;
        redrawFace(left.faceMat, lastFrom, left === a ? p.primary.main : p.text.secondary, left === a ? p.primary.contrastText : p.background.paper);
        redrawFace(right.faceMat, lastTo, right === a ? p.primary.main : p.text.secondary, right === a ? p.primary.contrastText : p.background.paper);
      }
      renderer.render(scene, camera);
      const moving = Math.abs(tg.orbit - state.orbit) + Math.abs(tg.spin - state.spin) > 0.002;
      if (visible && !reduced) raf = requestAnimationFrame(frame);
      else if (moving) raf = requestAnimationFrame(frame);
    };
    const redrawFace = (mat: THREE.MeshBasicMaterial, symbol: string, bg: string, fg: string) => {
      mat.map?.dispose();
      mat.map = faceTexture(symbol, bg, fg);
      mat.needsUpdate = true;
    };
    const kick = () => {
      if (!raf) raf = requestAnimationFrame(frame);
    };
    redraw.current = kick;

    const resize = () => {
      const { clientWidth: w, clientHeight: h } = el;
      renderer.setSize(w, h, false);
      camera.aspect = w / Math.max(h, 1);
      camera.updateProjectionMatrix();
      kick();
    };
    const ro = new ResizeObserver(resize);
    ro.observe(el);
    const io = new IntersectionObserver(([e]) => {
      visible = e.isIntersecting;
      if (visible) kick();
    });
    io.observe(el);
    resize();

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      io.disconnect();
      disposables.forEach((d) => d.dispose());
      renderer.dispose();
      renderer.domElement.remove();
      redraw.current = () => {};
    };
  }, [p]);

  return <Box ref={host} sx={{ width: "100%", height: 88, "& canvas": { width: "100%", height: "100%", display: "block" } }} />;
}
