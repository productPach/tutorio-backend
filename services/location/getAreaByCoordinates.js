import axios from "axios";

/**
 * Получение области и города по координатам (fallback через OpenStreetMap)
 * @param {number} lat - широта
 * @param {number} lon - долгота
 * @returns {Promise<{area: string, city: string}>}
 */
export async function getAreaByCoordinates(lat, lon) {
  try {
    const res = await axios.get(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}`
    );

    const address = res.data.address || {};
    const area = address.state || address.region || "";
    const city =
      address.city || address.town || address.village || address.county || "";

    return { area, city };
  } catch (e) {
    console.error("Ошибка при определении координат:", e.message);
    return { area: "", city: "" };
  }
}
