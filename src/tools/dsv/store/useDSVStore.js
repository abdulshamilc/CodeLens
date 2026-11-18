// src/tools/dsv/store/useDSVStore.js
// Safe navigation state for DSV (selected topic and type variant)

import { create } from "zustand";
import { DSV_TOPICS } from "../types";

const DSV_LAST_TOPIC_KEY = "codelens_dsv_last_topic";

function loadLastTopic() {
  try {
    return localStorage.getItem(DSV_LAST_TOPIC_KEY) || null;
  } catch {
    return null;
  }
}

const initialTopicId = loadLastTopic();
const initialTopic = initialTopicId ? DSV_TOPICS.find((t) => t.id === initialTopicId) : null;
const initialTypeId = initialTopic?.types?.[0]?.id || null;

export const useDSVStore = create((set) => ({
  selectedTopicId: initialTopicId,
  selectedTypeId: initialTypeId,

  setTopic: (topicId) => {
    if (!topicId) {
      set({ selectedTopicId: null, selectedTypeId: null });
      try {
        localStorage.removeItem(DSV_LAST_TOPIC_KEY);
      } catch {}
      return;
    }

    const topic = DSV_TOPICS.find((t) => t.id === topicId);
    const defaultType = topic?.types?.[0]?.id || null;

    set({
      selectedTopicId: topicId,
      selectedTypeId: defaultType,
    });

    try {
      localStorage.setItem(DSV_LAST_TOPIC_KEY, topicId);
    } catch {}
  },

  setType: (typeId) => set({ selectedTypeId: typeId }),
}));

export default useDSVStore;
