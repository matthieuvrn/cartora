"use client";

import type { CSSProperties, ReactNode } from "react";
import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type Announcements,
  type DragEndEvent,
  type ScreenReaderInstructions,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { restrictToVerticalAxis } from "@dnd-kit/modifiers";
import { CSS } from "@dnd-kit/utilities";
import { useTranslations } from "next-intl";

type SortableListProps = {
  /** Ids dans l'ordre AFFICHÉ (l'ordre optimiste, pas forcément celui du serveur). */
  ids: string[];
  /** Nom lisible par id — alimente les annonces lecteur d'écran. */
  labelFor: (id: string) => string;
  /** Reçoit l'array COMPLET réordonné — même contrat que les actions reorder existantes. */
  onReorder: (orderedIds: string[]) => void;
  disabled?: boolean;
  children: ReactNode;
};

/**
 * Contexte de tri vertical partagé (items d'une catégorie, catégories entre
 * elles) : pointeur (drag après 8 px — souris ET tactile) + clavier (Espace
 * pour saisir, flèches pour déplacer, Espace pour déposer, Échap pour annuler),
 * avec annonces lecteur d'écran localisées. Le drop remonte l'array complet
 * réordonné — exactement le payload des flèches Monter/Descendre.
 */
export function SortableList({
  ids,
  labelFor,
  onReorder,
  disabled = false,
  children,
}: SortableListProps) {
  const t = useTranslations("Dashboard.dnd");
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const position = (id: string | number) => ids.indexOf(String(id)) + 1;
  const values = (id: string | number, overId?: string | number) => ({
    name: labelFor(String(id)),
    position: overId !== undefined ? position(overId) : position(id),
    total: ids.length,
  });

  const announcements: Announcements = {
    onDragStart: ({ active }) => t("pickedUp", values(active.id)),
    onDragOver: ({ active, over }) =>
      over ? t("movedOver", values(active.id, over.id)) : undefined,
    onDragEnd: ({ active, over }) =>
      over ? t("dropped", values(active.id, over.id)) : t("canceled", values(active.id)),
    onDragCancel: ({ active }) => t("canceled", values(active.id)),
  };

  const screenReaderInstructions: ScreenReaderInstructions = {
    draggable: t("instructions"),
  };

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const from = ids.indexOf(String(active.id));
    const to = ids.indexOf(String(over.id));
    if (from < 0 || to < 0) return;
    onReorder(arrayMove(ids, from, to));
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      modifiers={[restrictToVerticalAxis]}
      accessibility={{ announcements, screenReaderInstructions }}
      onDragEnd={handleDragEnd}
    >
      <SortableContext items={ids} strategy={verticalListSortingStrategy} disabled={disabled}>
        {children}
      </SortableContext>
    </DndContext>
  );
}

/**
 * Branche une rangée sur le contexte de tri : `setNodeRef` + `style` à poser
 * sur le conteneur de la rangée, `handleAttributes`/`handleListeners` à étaler
 * sur le HANDLE uniquement — le reste de la rangée reste librement cliquable.
 */
export function useSortableRow(id: string, options?: { disabled?: boolean }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id,
    disabled: options?.disabled,
  });
  const style: CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
  };
  return {
    setNodeRef,
    style,
    isDragging,
    handleAttributes: attributes,
    handleListeners: listeners,
  };
}
