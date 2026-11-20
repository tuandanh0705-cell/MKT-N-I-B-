"use client";

import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { RotateCcw, Sparkles } from "lucide-react";
import {
  animatePirateRig,
  buildPirateCrewRig,
  isSharedPirateTexture,
  type PirateCharacterId,
  type PirateRig,
} from "@/lib/pirate-3d-builder";
import { getPirateCharacter, PirateAvatar } from "@/components/pirate-art";

export interface Pirate3DCrewMemberInput {
  userId: string;
  name: string;
  departmentScope: string;
  pirateCharacter?: string | null;
  subtitle: string;
  checkinStatus: "ON_TRACK" | "AT_RISK" | "DONE_TODAY" | "NONE";
}

interface Pirate3DCrewStageProps {
  members: Pirate3DCrewMemberInput[];
  selectedUserId: string;
  onSelectMember: (userId: string) => void;
  heightClassName?: string;
}

interface CrewNode {
  member: Pirate3DCrewMemberInput;
  character: ReturnType<typeof getPirateCharacter>;
  rig: PirateRig;
  labelPos: THREE.Vector3;
  isLeader: boolean;
}

function buildSunnyDeckBase(withSailMast: boolean) {
  const envGroup = new THREE.Group();

  // Mặt biển xanh lượn sóng nhẹ quanh tàu
  const seaMat = new THREE.MeshStandardMaterial({
    color: 0x0ea5e9,
    roughness: 0.25,
    metalness: 0.1,
    transparent: true,
    opacity: 0.85,
  });
  const seaPlane = new THREE.Mesh(new THREE.CircleGeometry(14, 48), seaMat);
  seaPlane.rotation.x = -Math.PI / 2;
  seaPlane.position.y = -0.55;
  envGroup.add(seaPlane);

  // Boong tàu gỗ Thousand Sunny
  const woodMat = new THREE.MeshStandardMaterial({
    color: 0xd97706,
    roughness: 0.68,
    metalness: 0.04,
  });
  const trimMat = new THREE.MeshStandardMaterial({
    color: 0x78350f,
    roughness: 0.58,
    metalness: 0.05,
  });

  const deck = new THREE.Mesh(
    new THREE.CylinderGeometry(5.6, 5.1, 0.45, 42),
    woodMat
  );
  deck.scale.set(1.16, 1, 0.72);
  deck.position.y = -0.24;
  deck.receiveShadow = true;
  envGroup.add(deck);

  // Viền tàu màu gỗ sẫm
  const deckRim = new THREE.Mesh(
    new THREE.TorusGeometry(5.45, 0.16, 12, 48),
    trimMat
  );
  deckRim.rotation.x = Math.PI / 2;
  deckRim.scale.set(1.16, 0.72, 1);
  deckRim.position.y = -0.02;
  envGroup.add(deckRim);

  if (withSailMast) {
    // Bậc boong trên cho hàng sau
    const upperStep = new THREE.Mesh(
      new THREE.BoxGeometry(10.2, 0.34, 2.3),
      woodMat
    );
    upperStep.position.set(0, 0.15, -1.35);
    upperStep.receiveShadow = true;
    envGroup.add(upperStep);

    const upperTrim = new THREE.Mesh(
      new THREE.BoxGeometry(10.35, 0.09, 2.4),
      trimMat
    );
    upperTrim.position.set(0, 0.32, -1.35);
    envGroup.add(upperTrim);

    // Cột buồm & cánh buồm Mũ Rơm phía sau
    const mast = new THREE.Mesh(
      new THREE.CylinderGeometry(0.14, 0.18, 5.2, 16),
      trimMat
    );
    mast.position.set(0, 2.4, -2.75);
    envGroup.add(mast);

    const sail = new THREE.Mesh(
      new THREE.BoxGeometry(4.2, 2.35, 0.08),
      new THREE.MeshStandardMaterial({ color: 0xfffbeb, roughness: 0.8 })
    );
    sail.position.set(0, 3.2, -2.6);
    envGroup.add(sail);

    // Biểu tượng mặt trời / mũ rơm trên cánh buồm
    const emblem = new THREE.Mesh(
      new THREE.CylinderGeometry(0.45, 0.45, 0.11, 24),
      new THREE.MeshStandardMaterial({ color: 0xfacc15, roughness: 0.4 })
    );
    emblem.rotation.x = Math.PI / 2;
    emblem.position.set(0, 3.22, -2.56);
    envGroup.add(emblem);

    const emblemRibbon = new THREE.Mesh(
      new THREE.BoxGeometry(0.95, 0.16, 0.12),
      new THREE.MeshStandardMaterial({ color: 0xef4444, roughness: 0.4 })
    );
    emblemRibbon.position.set(0, 3.16, -2.56);
    envGroup.add(emblemRibbon);

    // Mặt sư tử Sunny mini dễ thương ở mũi tàu phía trước
    const lionGroup = new THREE.Group();
    lionGroup.position.set(0, -0.05, 3.85);
    const mane = new THREE.Mesh(
      new THREE.CylinderGeometry(0.55, 0.55, 0.18, 12),
      new THREE.MeshStandardMaterial({ color: 0xf59e0b, roughness: 0.4 })
    );
    mane.rotation.x = Math.PI / 2;
    const face = new THREE.Mesh(
      new THREE.SphereGeometry(0.35, 18, 18),
      new THREE.MeshStandardMaterial({ color: 0xfef08a, roughness: 0.4 })
    );
    face.position.z = 0.06;
    lionGroup.add(mane, face);
    envGroup.add(lionGroup);
  }

  return { envGroup, seaPlane };
}

function disposeMaterial(mat: THREE.Material) {
  if ("map" in mat && mat.map instanceof THREE.Texture && !isSharedPirateTexture(mat.map)) {
    mat.map.dispose();
  }
  if (mat instanceof THREE.ShaderMaterial && mat.uniforms) {
    for (const u of Object.values(mat.uniforms)) {
      if (u && u.value instanceof THREE.Texture && !isSharedPirateTexture(u.value)) {
        u.value.dispose();
      }
    }
  }
  mat.dispose();
}

function disposeSceneObjects(root: THREE.Object3D) {
  root.traverse((obj) => {
    if (obj instanceof THREE.Mesh) {
      obj.geometry.dispose();
      if (Array.isArray(obj.material)) {
        obj.material.forEach(disposeMaterial);
      } else {
        disposeMaterial(obj.material);
      }
    }
  });
}

/**
 * Sân khấu 3D trực tiếp toàn Băng Mũ Rơm trên boong tàu Sunny (Leader Hub).
 * Toàn bộ nhân vật chuyển động liên tục, xoay theo chuột, nhảy ăn mừng & cho phép kéo xoay góc nhìn 3D.
 */
export function Pirate3DCrewStage({
  members,
  selectedUserId,
  onSelectMember,
  heightClassName = "h-[280px] sm:h-[320px]",
}: Pirate3DCrewStageProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const labelRefs = useRef<Record<string, HTMLButtonElement | null>>({});

  const selectedIdRef = useRef(selectedUserId);
  const membersRef = useRef(members);
  const onSelectRef = useRef(onSelectMember);

  useEffect(() => {
    selectedIdRef.current = selectedUserId;
  }, [selectedUserId]);

  useEffect(() => {
    membersRef.current = members;
  }, [members]);

  useEffect(() => {
    onSelectRef.current = onSelectMember;
  }, [onSelectMember]);

  const [hoveredInfo, setHoveredInfo] = useState<{
    name: string;
    rank: string;
    subtitle: string;
    checkinStatus: string;
  } | null>(null);

  const resetOrbitRef = useRef<(() => void) | null>(null);
  const celebrateMemberRef = useRef<((userId: string) => void) | null>(null);

  // Nhảy ăn mừng mỗi khi user chọn từ thanh thẻ bên dưới
  useEffect(() => {
    if (selectedUserId && selectedUserId !== "ALL") {
      celebrateMemberRef.current?.(selectedUserId);
    }
  }, [selectedUserId]);

  const crewKey = members
    .map(
      (m) =>
        `${m.userId}:${m.name}:${m.departmentScope}:${m.pirateCharacter || ""}`
    )
    .join("|");

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({
        antialias: true,
        alpha: true,
        powerPreference: "high-performance",
      });
    } catch {
      container.innerHTML =
        '<div class="flex items-center justify-center h-full text-xs font-semibold text-slate-700">Trình duyệt chưa hỗ trợ WebGL 3D.</div>';
      return;
    }

    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.domElement.style.width = "100%";
    renderer.domElement.style.height = "100%";
    renderer.domElement.style.display = "block";
    renderer.domElement.style.touchAction = "pan-y";
    container.appendChild(renderer.domElement);

    const scene = new THREE.Scene();

    const width = Math.max(container.clientWidth, 320);
    const height = Math.max(container.clientHeight, 240);
    const camera = new THREE.PerspectiveCamera(36, width / height, 0.1, 60);
    renderer.setSize(width, height, false);

    // Ánh sáng studio ấm áp kiểu phim hoạt hình 3D
    const hemi = new THREE.HemisphereLight(0xfffbeb, 0x0284c7, 1.35);
    scene.add(hemi);

    const sun = new THREE.DirectionalLight(0xfff7ed, 1.85);
    sun.position.set(5, 9, 7);
    sun.castShadow = true;
    sun.shadow.mapSize.set(1024, 1024);
    sun.shadow.camera.near = 1;
    sun.shadow.camera.far = 26;
    sun.shadow.camera.left = -7;
    sun.shadow.camera.right = 7;
    sun.shadow.camera.top = 5;
    sun.shadow.camera.bottom = -5;
    scene.add(sun);

    const rimLight = new THREE.DirectionalLight(0x38bdf8, 0.75);
    rimLight.position.set(-6, 4, -5);
    scene.add(rimLight);

    const { envGroup, seaPlane } = buildSunnyDeckBase(true);
    scene.add(envGroup);

    // Dựng đội hình 3D cho cả Leader Luffy + các thuyền viên
    const currentMembers = membersRef.current;
    const leaderMember = currentMembers.find((m) => m.departmentScope === "LEADER");
    const crewMembers = currentMembers.filter((m) => m.departmentScope !== "LEADER");

    const orderedSlots: Array<{
      member: Pirate3DCrewMemberInput;
      pos: [number, number, number];
      isLeader: boolean;
    }> = [];

    if (leaderMember) {
      orderedSlots.push({
        member: leaderMember,
        pos: [0, 0.36, -1.42],
        isLeader: true,
      });
    }

    const frontCount = Math.ceil(crewMembers.length / 2);
    const backCrewCount = crewMembers.length - frontCount;
    const frontCrew = crewMembers.slice(0, frontCount);
    const backCrew = crewMembers.slice(frontCount);

    frontCrew.forEach((member, idx) => {
      const span = Math.min(8.6, Math.max(4.5, frontCount * 1.9));
      const x =
        frontCount === 1
          ? 0
          : -span / 2 + (idx * span) / (frontCount - 1);
      const zCurve = 1.28 - Math.abs(x) * 0.06;
      orderedSlots.push({
        member,
        pos: [x, 0, zCurve],
        isLeader: false,
      });
    });

    const backSideSlots: number[] = [];
    if (backCrewCount > 0) {
      const halfLeft = Math.ceil(backCrewCount / 2);
      const halfRight = backCrewCount - halfLeft;
      for (let i = 0; i < halfLeft; i++) {
        backSideSlots.push(
          halfLeft === 1
            ? -2.8
            : -4.45 + (i * 2.2) / Math.max(1, halfLeft - 1)
        );
      }
      for (let i = 0; i < halfRight; i++) {
        backSideSlots.push(
          halfRight === 1
            ? 2.8
            : 2.25 + (i * 2.2) / Math.max(1, halfRight - 1)
        );
      }
    }

    backCrew.forEach((member, idx) => {
      const x = backSideSlots[idx] ?? 0;
      orderedSlots.push({
        member,
        pos: [x, 0.36, -1.3],
        isLeader: false,
      });
    });

    const textureLoader = new THREE.TextureLoader();

    const crewNodes: CrewNode[] = orderedSlots.map((slot, idx) => {
      const char = getPirateCharacter(
        slot.member.name,
        slot.member.departmentScope,
        slot.member.pirateCharacter
      );
      const rig = buildPirateCrewRig(char.id, idx * 0.85, textureLoader);
      rig.root.position.set(slot.pos[0], slot.pos[1], slot.pos[2]);
      rig.baseY = slot.pos[1];
      rig.baseRotY = -slot.pos[0] * 0.045;
      rig.root.userData.memberId = slot.member.userId;
      rig.root.traverse((child) => {
        child.userData.memberId = slot.member.userId;
      });
      scene.add(rig.root);

      const isBackRow = slot.pos[2] < 0;
      return {
        member: slot.member,
        character: char,
        rig,
        labelPos: new THREE.Vector3(
          slot.pos[0],
          isBackRow ? slot.pos[1] + 2.18 : slot.pos[1] - 0.14,
          slot.pos[2] + (isBackRow ? 0 : 0.35)
        ),
        isLeader: slot.isLeader,
      };
    });

    celebrateMemberRef.current = (uid: string) => {
      const found = crewNodes.find((n) => n.member.userId === uid);
      if (found) found.rig.jumpEnergy = 1;
    };

    // Orbit camera state + raycast tương tác chuột
    let targetYaw = 0;
    let targetPitch = 0.28;
    let currentYaw = 0;
    let currentPitch = 0.28;
    let targetPointerYaw = 0;
    let targetPointerPitch = 0;
    let isDragging = false;
    let pointerDownPos = { x: 0, y: 0 };
    let lastDragPos = { x: 0, y: 0 };
    let hoveredUserId: string | null = null;

    resetOrbitRef.current = () => {
      targetYaw = 0;
      targetPitch = 0.28;
      for (const n of crewNodes) {
        n.rig.jumpEnergy = 0.7;
      }
    };

    const raycaster = new THREE.Raycaster();
    const pointerNdc = new THREE.Vector2(99, 99);

    function updateRaycast(clientX: number, clientY: number) {
      const rect = renderer.domElement.getBoundingClientRect();
      if (rect.width <= 0 || rect.height <= 0) return;
      pointerNdc.x = ((clientX - rect.left) / rect.width) * 2 - 1;
      pointerNdc.y = -((clientY - rect.top) / rect.height) * 2 + 1;
      targetPointerYaw = pointerNdc.x * 0.45;
      targetPointerPitch = pointerNdc.y * 0.28;

      raycaster.setFromCamera(pointerNdc, camera);
      const hits = raycaster.intersectObjects(
        crewNodes.map((n) => n.rig.root),
        true
      );
      const hitId = (hits[0]?.object.userData.memberId as string | undefined) || null;
      if (hitId !== hoveredUserId) {
        hoveredUserId = hitId;
        renderer.domElement.style.cursor = hitId ? "pointer" : "grab";
        if (hitId) {
          const found = crewNodes.find((n) => n.member.userId === hitId);
          if (found) {
            setHoveredInfo({
              name: found.member.name,
              rank: found.character.characterName,
              subtitle: found.member.subtitle,
              checkinStatus: found.member.checkinStatus,
            });
          }
        } else {
          setHoveredInfo(null);
        }
      }
    }

    const onPointerDown = (e: PointerEvent) => {
      isDragging = true;
      pointerDownPos = { x: e.clientX, y: e.clientY };
      lastDragPos = { x: e.clientX, y: e.clientY };
      renderer.domElement.style.cursor = "grabbing";
    };

    const onPointerMove = (e: PointerEvent) => {
      if (isDragging) {
        const dx = e.clientX - lastDragPos.x;
        const dy = e.clientY - lastDragPos.y;
        lastDragPos = { x: e.clientX, y: e.clientY };
        targetYaw = THREE.MathUtils.clamp(targetYaw - dx * 0.006, -0.85, 0.85);
        targetPitch = THREE.MathUtils.clamp(targetPitch + dy * 0.004, 0.12, 0.56);
      } else {
        updateRaycast(e.clientX, e.clientY);
      }
    };

    const onPointerUp = (e: PointerEvent) => {
      if (!isDragging) return;
      isDragging = false;
      const dist = Math.hypot(
        e.clientX - pointerDownPos.x,
        e.clientY - pointerDownPos.y
      );
      updateRaycast(e.clientX, e.clientY);
      if (dist < 6 && hoveredUserId) {
        const clicked = crewNodes.find((n) => n.member.userId === hoveredUserId);
        if (clicked) {
          clicked.rig.jumpEnergy = 1;
          onSelectRef.current(clicked.isLeader ? "ALL" : clicked.member.userId);
        }
      }
    };

    const onPointerLeave = () => {
      isDragging = false;
      hoveredUserId = null;
      targetPointerYaw = 0;
      targetPointerPitch = 0;
      setHoveredInfo(null);
    };

    const domEl = renderer.domElement;
    domEl.addEventListener("pointerdown", onPointerDown);
    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", onPointerUp);
    domEl.addEventListener("pointerleave", onPointerLeave);

    const resizeObserver = new ResizeObserver(() => {
      const w = Math.max(container.clientWidth, 320);
      const h = Math.max(container.clientHeight, 240);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h, false);
    });
    resizeObserver.observe(container);

    const clock = new THREE.Clock();
    const projVec = new THREE.Vector3();
    let rafId = 0;

    const animate = () => {
      rafId = requestAnimationFrame(animate);
      if (document.hidden) return;
      const delta = Math.min(clock.getDelta(), 0.05);
      const elapsed = clock.getElapsedTime();

      currentYaw = THREE.MathUtils.lerp(currentYaw, targetYaw, 0.1);
      currentPitch = THREE.MathUtils.lerp(currentPitch, targetPitch, 0.1);

      const radius = 11.4;
      camera.position.x = Math.sin(currentYaw) * Math.cos(currentPitch) * radius;
      camera.position.y = 1.05 + Math.sin(currentPitch) * radius;
      camera.position.z = Math.cos(currentYaw) * Math.cos(currentPitch) * radius;
      camera.lookAt(0, 0.95, -0.15);

      // Lắc nhẹ con tàu theo sóng biển
      envGroup.rotation.z = Math.sin(elapsed * 0.9) * 0.012;
      seaPlane.position.y = -0.55 + Math.sin(elapsed * 1.4) * 0.04;

      const latestSelected = selectedIdRef.current;
      const latestMap = new Map(membersRef.current.map((m) => [m.userId, m]));
      const canvasW = container.clientWidth;
      const canvasH = container.clientHeight;

      for (const node of crewNodes) {
        const liveMember = latestMap.get(node.member.userId) ?? node.member;
        const isSelected = !node.isLeader && latestSelected === node.member.userId;
        const isHovered = hoveredUserId === node.member.userId;

        animatePirateRig(node.rig, elapsed, delta, {
          hovered: isHovered,
          selected: isSelected,
          checkinStatus: liveMember.checkinStatus,
          targetLookYaw: targetPointerYaw,
          targetLookPitch: targetPointerPitch,
          spinOnJump: false,
        });

        // Đồng bộ vị trí nhãn tên theo tọa độ 3D thực tế trên màn hình
        const labelEl = labelRefs.current[node.member.userId];
        if (labelEl && canvasW > 0 && canvasH > 0) {
          projVec.copy(node.labelPos).project(camera);
          const x = (projVec.x * 0.5 + 0.5) * canvasW;
          const y = (-projVec.y * 0.5 + 0.5) * canvasH;
          labelEl.style.transform = `translate(${x.toFixed(1)}px, ${y.toFixed(1)}px) translate(-50%, -10%)`;
        }
      }

      renderer.render(scene, camera);
    };

    animate();

    return () => {
      cancelAnimationFrame(rafId);
      resizeObserver.disconnect();
      domEl.removeEventListener("pointerdown", onPointerDown);
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", onPointerUp);
      domEl.removeEventListener("pointerleave", onPointerLeave);
      disposeSceneObjects(scene);
      renderer.dispose();
      if (domEl.parentNode === container) {
        container.removeChild(domEl);
      }
    };
  }, [crewKey]);

  return (
    <div
      className={`relative w-full ${heightClassName} rounded-2xl overflow-hidden border-2 border-amber-300/80 bg-gradient-to-b from-sky-300 via-sky-200 to-cyan-100 shadow-inner select-none`}
    >
      {/* Mây trang trí nền trời 3D */}
      <div className="pointer-events-none absolute top-3 left-8 w-16 h-6 rounded-full bg-white/60 blur-[1px]" />
      <div className="pointer-events-none absolute top-6 right-24 w-24 h-7 rounded-full bg-white/50 blur-[1px]" />

      {/* Thanh hướng dẫn tương tác & nút Reset góc 3D */}
      <div className="absolute top-2.5 left-3 right-3 z-20 flex items-center justify-between gap-2 pointer-events-none">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-[#0B2545]/80 text-amber-200 px-3 py-1 text-[11px] font-bold backdrop-blur-sm shadow-sm">
          <Sparkles className="w-3 h-3 text-amber-300" />
          Sunny 3D • Kéo xoay • Bấm để lọc
        </span>

        <button
          type="button"
          onClick={() => resetOrbitRef.current?.()}
          className="pointer-events-auto inline-flex items-center gap-1 rounded-full bg-white/90 hover:bg-white text-slate-800 border border-amber-300 px-2.5 py-1 text-[11px] font-bold shadow-sm transition cursor-pointer"
        >
          <RotateCcw className="w-3 h-3" />
          Xoay chuẩn &amp; Nhảy
        </button>
      </div>

      {/* Bong bóng thông tin khi trỏ chuột vào nhân vật 3D */}
      {hoveredInfo && (
        <div className="pointer-events-none absolute bottom-3 left-1/2 -translate-x-1/2 z-30 rounded-2xl bg-[#0B2545]/95 text-white border border-amber-300/60 px-3.5 py-1.5 text-xs shadow-lg flex items-center gap-2 whitespace-nowrap">
          <span className="font-extrabold text-amber-300">{hoveredInfo.name}</span>
          <span className="text-sky-200">• {hoveredInfo.rank}</span>
          <span className="text-white/90 font-semibold">• {hoveredInfo.subtitle}</span>
          {hoveredInfo.checkinStatus === "AT_RISK" && (
            <span className="rounded-full bg-rose-500 px-2 py-0.5 text-[10px] font-bold">
              🌊 Gặp sóng lớn
            </span>
          )}
        </div>
      )}

      {/* Nhãn tên nổi đồng bộ 60fps theo vị trí 3D */}
      <div className="absolute inset-0 z-10 pointer-events-none overflow-hidden">
        {members.map((m) => {
          const char = getPirateCharacter(
            m.name,
            m.departmentScope,
            m.pirateCharacter
          );
          const isLeader = m.departmentScope === "LEADER";
          const isSelected = !isLeader && selectedUserId === m.userId;
          return (
            <button
              key={m.userId}
              ref={(el) => {
                labelRefs.current[m.userId] = el;
              }}
              type="button"
              onClick={() => onSelectMember(isLeader ? "ALL" : m.userId)}
              className={`pointer-events-auto absolute top-0 left-0 rounded-full px-2 py-0.5 text-[10px] font-extrabold shadow-sm border transition-colors cursor-pointer whitespace-nowrap ${
                isSelected
                  ? "bg-amber-400 text-slate-950 border-white ring-2 ring-amber-300"
                  : m.checkinStatus === "AT_RISK"
                    ? "bg-rose-600 text-white border-rose-200"
                    : m.checkinStatus === "ON_TRACK" || m.checkinStatus === "DONE_TODAY"
                      ? "bg-[#0B2545]/90 text-emerald-300 border-emerald-400/60 hover:bg-[#0B2545]"
                      : "bg-white/90 text-slate-800 border-amber-200 hover:bg-amber-50"
              }`}
            >
              {char.emoji} {isLeader ? "Luffy" : m.name}
            </button>
          );
        })}
      </div>

      {/* Canvas Three.js */}
      <div ref={containerRef} className="w-full h-full" />
    </div>
  );
}

interface Pirate3DSoloStageProps {
  name: string;
  scope?: string;
  pirateCharacter?: string | null;
  checkinStatus?: "ON_TRACK" | "AT_RISK" | "DONE_TODAY" | "NONE";
  celebrateNonce?: number;
  caption?: string;
  className?: string;
}

/**
 * Sân khấu 3D nhân vật cá nhân chuyển động liên tục (dùng ở Nhật Ký Hải Trình & Login).
 */
export function Pirate3DSoloStage({
  name,
  scope = "CONTENT",
  pirateCharacter,
  checkinStatus = "NONE",
  celebrateNonce = 0,
  caption,
  className = "h-56 w-full",
}: Pirate3DSoloStageProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const character = getPirateCharacter(name, scope, pirateCharacter);

  const characterIdRef = useRef<PirateCharacterId>(character.id);
  const statusRef = useRef(checkinStatus);

  useEffect(() => {
    statusRef.current = checkinStatus;
  }, [checkinStatus]);

  const swapCharacterRef = useRef<((id: PirateCharacterId) => void) | null>(null);
  const celebrateRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    if (characterIdRef.current !== character.id) {
      characterIdRef.current = character.id;
      swapCharacterRef.current?.(character.id);
    }
  }, [character.id]);

  useEffect(() => {
    if (celebrateNonce > 0) {
      celebrateRef.current?.();
    }
  }, [celebrateNonce]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    } catch {
      container.innerHTML =
        '<div class="flex items-center justify-center h-full text-xs font-semibold text-slate-700">Trình duyệt chưa hỗ trợ WebGL 3D.</div>';
      return;
    }

    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.shadowMap.enabled = true;
    renderer.domElement.style.width = "100%";
    renderer.domElement.style.height = "100%";
    renderer.domElement.style.display = "block";
    container.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    const w = Math.max(container.clientWidth, 200);
    const h = Math.max(container.clientHeight, 180);
    const camera = new THREE.PerspectiveCamera(34, w / h, 0.1, 40);
    camera.position.set(0, 1.32, 3.85);
    camera.lookAt(0, 0.92, 0);
    renderer.setSize(w, h, false);

    scene.add(new THREE.HemisphereLight(0xfffbeb, 0x0284c7, 1.45));
    const keyLight = new THREE.DirectionalLight(0xfff7ed, 1.9);
    keyLight.position.set(3, 5, 4);
    keyLight.castShadow = true;
    scene.add(keyLight);

    const { envGroup, seaPlane } = buildSunnyDeckBase(false);
    envGroup.scale.set(0.32, 0.45, 0.42);
    scene.add(envGroup);

    const textureLoader = new THREE.TextureLoader();

    let rig = buildPirateCrewRig(characterIdRef.current, 0, textureLoader);
    rig.root.scale.setScalar(1.05);
    scene.add(rig.root);

    let dragRotY = 0;
    let pointerLookYaw = 0;
    let pointerLookPitch = 0;
    let isHovered = false;
    let isDragging = false;
    let lastX = 0;

    swapCharacterRef.current = (nextId: PirateCharacterId) => {
      scene.remove(rig.root);
      disposeSceneObjects(rig.root);
      rig = buildPirateCrewRig(nextId, 0, textureLoader);
      rig.jumpEnergy = 0.85;
      scene.add(rig.root);
    };

    celebrateRef.current = () => {
      rig.jumpEnergy = 1;
    };

    const domEl = renderer.domElement;
    const onPointerDown = (e: PointerEvent) => {
      isDragging = true;
      lastX = e.clientX;
      rig.jumpEnergy = 0.9;
    };
    const onPointerMove = (e: PointerEvent) => {
      const rect = domEl.getBoundingClientRect();
      if (isDragging) {
        dragRotY += (e.clientX - lastX) * 0.014;
        lastX = e.clientX;
      } else if (rect.width > 0) {
        const nx = ((e.clientX - rect.left) / rect.width) * 2 - 1;
        const ny = -((e.clientY - rect.top) / Math.max(rect.height, 1)) * 2 + 1;
        pointerLookYaw = THREE.MathUtils.clamp(nx * 0.55, -0.55, 0.55);
        pointerLookPitch = THREE.MathUtils.clamp(ny * 0.35, -0.35, 0.35);
      }
    };
    const onPointerUp = () => {
      isDragging = false;
    };
    const onPointerEnter = () => {
      isHovered = true;
    };
    const onPointerLeave = () => {
      isHovered = false;
      isDragging = false;
      pointerLookYaw = 0;
      pointerLookPitch = 0;
    };

    domEl.addEventListener("pointerdown", onPointerDown);
    domEl.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", onPointerUp);
    domEl.addEventListener("pointerenter", onPointerEnter);
    domEl.addEventListener("pointerleave", onPointerLeave);

    const resizeObserver = new ResizeObserver(() => {
      const nw = Math.max(container.clientWidth, 200);
      const nh = Math.max(container.clientHeight, 180);
      camera.aspect = nw / nh;
      camera.updateProjectionMatrix();
      renderer.setSize(nw, nh, false);
    });
    resizeObserver.observe(container);

    const clock = new THREE.Clock();
    let rafId = 0;

    const animate = () => {
      rafId = requestAnimationFrame(animate);
      if (document.hidden) return;
      const delta = Math.min(clock.getDelta(), 0.05);
      const elapsed = clock.getElapsedTime();

      if (!isDragging) {
        dragRotY = THREE.MathUtils.lerp(dragRotY, Math.sin(elapsed * 0.7) * 0.16, 0.04);
      }
      rig.baseRotY = dragRotY;
      seaPlane.position.y = -0.55 + Math.sin(elapsed * 1.6) * 0.04;

      animatePirateRig(rig, elapsed, delta, {
        hovered: isHovered,
        selected: false,
        checkinStatus: statusRef.current,
        targetLookYaw: pointerLookYaw,
        targetLookPitch: pointerLookPitch,
        spinOnJump: false,
      });

      renderer.render(scene, camera);
    };

    animate();

    return () => {
      cancelAnimationFrame(rafId);
      resizeObserver.disconnect();
      domEl.removeEventListener("pointerdown", onPointerDown);
      domEl.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", onPointerUp);
      domEl.removeEventListener("pointerenter", onPointerEnter);
      domEl.removeEventListener("pointerleave", onPointerLeave);
      disposeSceneObjects(scene);
      renderer.dispose();
      if (domEl.parentNode === container) {
        container.removeChild(domEl);
      }
    };
  }, []);

  return (
    <div
      className={`relative rounded-2xl overflow-hidden border-2 border-amber-300/70 bg-gradient-to-b from-sky-300 via-sky-200 to-cyan-100 select-none ${className}`}
    >
      <div className="pointer-events-none absolute top-2 left-2.5 right-2.5 z-10 flex items-center justify-between gap-2">
        <span className="rounded-full bg-[#0B2545]/85 text-amber-200 px-2.5 py-0.5 text-[11px] font-bold shadow-sm truncate">
          {character.emoji} {character.characterName}
        </span>
      </div>

      {caption && (
        <div className="pointer-events-none absolute bottom-2 left-1/2 -translate-x-1/2 z-10 rounded-full bg-white/90 border border-amber-200 px-3 py-0.5 text-[11px] font-bold text-slate-800 whitespace-nowrap shadow-sm">
          {caption}
        </div>
      )}

      <div ref={containerRef} className="w-full h-full cursor-grab active:cursor-grabbing" />
    </div>
  );
}

export interface Pirate3DCardItem {
  userId: string;
  name: string;
  title: string;
  departmentScope: string;
  avatarColor: string;
  pirateCharacter?: string | null;
  checkinStatus: "ON_TRACK" | "AT_RISK" | "DONE_TODAY" | "NONE";
  checkinNote?: string | null;
  limit: number | null;
  used: number;
  unit: string;
  activeTasksCount: number;
  utilizationPercent: number;
  capacityStatus: "AVAILABLE" | "NEAR_LIMIT" | "FULL";
}

interface Pirate3DCrewCardGridProps {
  cards: Pirate3DCardItem[];
  selectedUserId: string;
  onSelectMember: (userId: string) => void;
}

/**
 * Lưới 8 thẻ thuyền viên: Tên & tiến độ ở BÊN TRÁI, nhân vật 3D chuyển động trực tiếp ở BÊN PHẢI.
 * Toàn bộ lưới chỉ dùng 1 WebGL context duy nhất (kỹ thuật Scissor Viewport) để mượt 60fps trên mọi thiết bị.
 */
export function Pirate3DCrewCardGrid({
  cards,
  selectedUserId,
  onSelectMember,
}: Pirate3DCrewCardGridProps) {
  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const slotRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const fallbackRefs = useRef<Record<string, HTMLDivElement | null>>({});

  const cardsRef = useRef(cards);
  const selectedIdRef = useRef(selectedUserId);
  const hoveredIdRef = useRef<string | null>(null);
  const pointerYawRef = useRef<number>(0);
  const pointerPitchRef = useRef<number>(0);
  const celebrateIdRef = useRef<((userId: string) => void) | null>(null);

  useEffect(() => {
    cardsRef.current = cards;
  }, [cards]);

  useEffect(() => {
    selectedIdRef.current = selectedUserId;
    if (selectedUserId && selectedUserId !== "ALL") {
      celebrateIdRef.current?.(selectedUserId);
    }
  }, [selectedUserId]);

  const rosterKey = cards
    .map(
      (c) =>
        `${c.userId}:${c.name}:${c.departmentScope}:${c.pirateCharacter || ""}`
    )
    .join("|");

  useEffect(() => {
    const wrapper = wrapperRef.current;
    const canvas = canvasRef.current;
    if (!wrapper || !canvas) return;

    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({
        canvas,
        antialias: true,
        alpha: true,
        powerPreference: "high-performance",
      });
    } catch {
      return;
    }

    renderer.setClearColor(0x000000, 0);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));

    // Ẩn avatar tĩnh fallback khi WebGL 3D đã chạy thành công
    for (const key of Object.keys(fallbackRefs.current)) {
      const el = fallbackRefs.current[key];
      if (el) el.style.display = "none";
    }

    const scene = new THREE.Scene();
    scene.add(new THREE.HemisphereLight(0xfffbeb, 0x0284c7, 1.45));

    const sun = new THREE.DirectionalLight(0xfff7ed, 1.8);
    sun.position.set(3, 6, 5);
    scene.add(sun);

    const rim = new THREE.DirectionalLight(0x38bdf8, 0.7);
    rim.position.set(-4, 3, -3);
    scene.add(rim);

    const camera = new THREE.PerspectiveCamera(34, 1, 0.1, 30);
    camera.position.set(0, 1.06, 3.88);
    camera.lookAt(0, 0.95, 0);

    const pedestalGeo = new THREE.CylinderGeometry(0.58, 0.5, 0.1, 24);
    const pedestalMat = new THREE.MeshStandardMaterial({
      color: 0xb45309,
      roughness: 0.55,
      metalness: 0.08,
    });
    const pedestalRimGeo = new THREE.TorusGeometry(0.57, 0.025, 10, 32);
    const pedestalRimMat = new THREE.MeshStandardMaterial({
      color: 0xfacc15,
      roughness: 0.28,
      metalness: 0.45,
    });
    const textureLoader = new THREE.TextureLoader();

    const nodeEntries = cardsRef.current.map((card, idx) => {
      const char = getPirateCharacter(
        card.name,
        card.departmentScope,
        card.pirateCharacter
      );
      const containerGroup = new THREE.Group();

      const pedestal = new THREE.Mesh(pedestalGeo, pedestalMat);
      pedestal.position.y = -0.05;
      containerGroup.add(pedestal);

      const pedestalRim = new THREE.Mesh(pedestalRimGeo, pedestalRimMat);
      pedestalRim.rotation.x = Math.PI / 2;
      pedestalRim.position.y = -0.002;
      containerGroup.add(pedestalRim);

      const rig = buildPirateCrewRig(char.id, idx * 0.9, textureLoader);
      containerGroup.add(rig.root);
      containerGroup.visible = false;
      scene.add(containerGroup);

      return {
        userId: card.userId,
        containerGroup,
        rig,
      };
    });

    celebrateIdRef.current = (uid: string) => {
      const hit = nodeEntries.find((n) => n.userId === uid);
      if (hit) hit.rig.jumpEnergy = 1;
    };

    let lastW = 0;
    let lastH = 0;
    const syncCanvasSize = () => {
      const rect = wrapper.getBoundingClientRect();
      const w = Math.max(1, Math.round(rect.width));
      const h = Math.max(1, Math.round(rect.height));
      if (w !== lastW || h !== lastH) {
        lastW = w;
        lastH = h;
        renderer.setSize(w, h, false);
      }
      return rect;
    };

    const resizeObserver = new ResizeObserver(() => {
      syncCanvasSize();
    });
    resizeObserver.observe(wrapper);

    const clock = new THREE.Clock();
    let rafId = 0;

    const animate = () => {
      rafId = requestAnimationFrame(animate);
      if (document.hidden) return;
      const delta = Math.min(clock.getDelta(), 0.05);
      const elapsed = clock.getElapsedTime();

      const wrapperRect = syncCanvasSize();
      if (wrapperRect.width <= 0 || wrapperRect.height <= 0) return;

      const liveCardMap = new Map(cardsRef.current.map((c) => [c.userId, c]));
      const activeSelected = selectedIdRef.current;
      const activeHovered = hoveredIdRef.current;

      renderer.setScissorTest(false);
      renderer.clear();
      renderer.setScissorTest(true);

      for (const entry of nodeEntries) {
        const liveCard = liveCardMap.get(entry.userId);
        if (!liveCard) continue;

        const isHovered = activeHovered === entry.userId;
        const isSelected = activeSelected === entry.userId;

        animatePirateRig(entry.rig, elapsed, delta, {
          hovered: isHovered,
          selected: isSelected,
          checkinStatus: liveCard.checkinStatus,
          targetLookYaw: isHovered ? pointerYawRef.current : 0,
          targetLookPitch: isHovered ? pointerPitchRef.current : 0,
          jumpScale: 0.45,
          maxScale: 1.05,
          spinOnJump: false,
        });

        const slotEl = slotRefs.current[entry.userId];
        if (!slotEl) continue;

        const slotRect = slotEl.getBoundingClientRect();
        const x = slotRect.left - wrapperRect.left;
        const yTop = slotRect.top - wrapperRect.top;
        const w = slotRect.width;
        const h = slotRect.height;
        if (w <= 0 || h <= 0) continue;

        const bottom = wrapperRect.height - (yTop + h);
        if (bottom + h < 0 || bottom > wrapperRect.height) continue;

        camera.aspect = w / h;
        camera.updateProjectionMatrix();

        entry.containerGroup.visible = true;
        renderer.setViewport(x, bottom, w, h);
        renderer.setScissor(x, bottom, w, h);
        renderer.render(scene, camera);
        entry.containerGroup.visible = false;
      }
    };

    animate();

    return () => {
      cancelAnimationFrame(rafId);
      resizeObserver.disconnect();
      pedestalGeo.dispose();
      pedestalMat.dispose();
      pedestalRimGeo.dispose();
      pedestalRimMat.dispose();
      disposeSceneObjects(scene);
      renderer.dispose();
    };
  }, [rosterKey]);

  return (
    <div ref={wrapperRef} className="relative">
      <canvas
        ref={canvasRef}
        className="pointer-events-none absolute inset-0 w-full h-full z-10"
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {cards.map((c) => {
          const selected = selectedUserId === c.userId;
          const char = getPirateCharacter(
            c.name,
            c.departmentScope,
            c.pirateCharacter
          );

          return (
            <button
              key={c.userId}
              type="button"
              onClick={() => {
                celebrateIdRef.current?.(c.userId);
                onSelectMember(c.userId);
              }}
              onMouseEnter={() => {
                hoveredIdRef.current = c.userId;
              }}
              onMouseLeave={() => {
                if (hoveredIdRef.current === c.userId) {
                  hoveredIdRef.current = null;
                }
                pointerYawRef.current = 0;
                pointerPitchRef.current = 0;
              }}
              onMouseMove={(e) => {
                const rect = e.currentTarget.getBoundingClientRect();
                if (rect.width > 0) {
                  const nx = ((e.clientX - rect.left) / rect.width) * 2 - 1;
                  const ny = -((e.clientY - rect.top) / Math.max(rect.height, 1)) * 2 + 1;
                  pointerYawRef.current = THREE.MathUtils.clamp(nx * 0.55, -0.55, 0.55);
                  pointerPitchRef.current = THREE.MathUtils.clamp(ny * 0.35, -0.35, 0.35);
                }
              }}
              title={c.checkinNote || c.name}
              className={`group text-left rounded-2xl border-2 p-2.5 xl:p-3 transition hover:-translate-y-0.5 cursor-pointer flex items-center justify-between gap-1.5 xl:gap-2 ${
                selected
                  ? "border-amber-400 bg-amber-50/90 ring-2 ring-amber-400/30 shadow-sm"
                  : "border-amber-200/80 hover:border-sky-400 bg-[#FFFDF7]"
              }`}
            >
              {/* BÊN TRÁI: Tên, Nhân vật, Tiến độ & Thanh công suất */}
              <div className="min-w-0 flex-1 flex flex-col justify-between self-stretch py-0.5">
                <div>
                  <div className="flex items-center gap-1">
                    <span
                      className={`w-2 h-2 rounded-full shrink-0 ${
                        c.checkinStatus === "AT_RISK"
                          ? "bg-rose-500 animate-pulse"
                          : c.checkinStatus !== "NONE"
                            ? "bg-emerald-500"
                            : "bg-slate-300"
                      }`}
                      title={
                        c.checkinStatus === "AT_RISK"
                          ? "Đang gặp sóng lớn"
                          : c.checkinStatus !== "NONE"
                            ? "Đã điểm danh ra khơi"
                            : "Chưa điểm danh 9h"
                      }
                    />
                    <span className="text-[12.5px] xl:text-[13.5px] font-extrabold text-slate-900 truncate leading-tight">
                      {c.name}
                    </span>
                  </div>

                  <div className="text-[10.5px] xl:text-[11px] font-bold text-amber-700 truncate mt-0.5">
                    {char.emoji} {char.characterName}
                  </div>
                </div>

                <div className="mt-2">
                  <div className="flex items-center justify-between gap-1 text-[11px] font-semibold text-slate-600">
                    <span>
                      {c.limit
                        ? `${c.used}/${c.limit} ${c.unit}`
                        : `${c.activeTasksCount} việc`}
                    </span>
                    {c.checkinStatus === "AT_RISK" && (
                      <span className="text-[10px] font-bold text-rose-600">
                        Sóng lớn
                      </span>
                    )}
                  </div>

                  <div className="mt-1 h-1.5 w-full rounded-full bg-amber-100 overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${
                        c.capacityStatus === "FULL"
                          ? "bg-rose-500"
                          : c.capacityStatus === "NEAR_LIMIT"
                            ? "bg-amber-500"
                            : "bg-sky-500"
                      }`}
                      style={{
                        width: `${Math.min(100, c.utilizationPercent)}%`,
                      }}
                    />
                  </div>
                </div>
              </div>

              {/* BÊN PHẢI: Nhân vật 3D chuyển động trực tiếp */}
              <div
                ref={(el) => {
                  slotRefs.current[c.userId] = el;
                }}
                className="relative w-[74px] h-[84px] sm:w-[82px] sm:h-[90px] xl:w-[90px] xl:h-[96px] shrink-0 rounded-xl bg-gradient-to-b from-sky-200/80 via-sky-100/60 to-amber-100/60 border border-amber-200/80 overflow-hidden flex items-center justify-center"
              >
                <div
                  ref={(el) => {
                    fallbackRefs.current[c.userId] = el;
                  }}
                >
                  <PirateAvatar
                    name={c.name}
                    color={c.avatarColor}
                    scope={c.departmentScope}
                    pirateCharacter={c.pirateCharacter}
                    size="lg"
                    animate={false}
                  />
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
