import { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowDown, ArrowRight, Download, Plus, Save, Search, Sparkles, Star, Upload, X } from 'lucide-react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar';
import { useAuth } from '../context/AuthContext';
import { usePageScrollRestoration, useSessionStorageState } from '../hooks/usePagePersistence';
import { consumePendingPremiumPlannerSeed } from '../utils/premiumPlannerTransfer';
import { buildUrl } from '../services/authService.jsx';

const STYLE_OPTIONS = [
    { value: 'flowering_cottage', label: 'Flowering Cottage', summary: 'Soft borders, colorful blooms, and a romantic home-garden feel.' },
    { value: 'stone_gravel', label: 'Stone & Gravel', summary: 'A cleaner, drier look with gravel, stone, and architectural planting.' },
    { value: 'modern_minimal', label: 'Modern Minimal', summary: 'Contemporary lines, disciplined planting, and a refined palette.' },
    { value: 'mediterranean', label: 'Mediterranean', summary: 'Warm stone, sun-washed planting, and a drought-aware outdoor vibe.' },
    { value: 'japanese_zen', label: 'Japanese Zen', summary: 'Calm composition, stones, texture contrast, and breathing room.' },
];


const REALISM_OPTIONS = [
    { value: 'easy_to_recreate', label: 'Easy to Recreate', summary: 'Keep it realistic for a normal home garden and easier to copy in real life.' },
    { value: 'balanced', label: 'Balanced', summary: 'Keep it believable, but allow a cleaner and more polished concept image.' },
    { value: 'concept_only', label: 'Concept Only', summary: 'Let the image be more aspirational while still staying physically plausible.' },
];

const BUDGET_OPTIONS = [
    { value: 'budget_friendly', label: 'Budget-Friendly', summary: 'Favor simpler materials, fewer plant varieties, and easier execution.' },
    { value: 'mid_range', label: 'Mid-Range', summary: 'Allow a more composed result with moderate material and planting richness.' },
    { value: 'premium', label: 'Premium', summary: 'Allow a higher-end look, but still keep it residential and believable.' },
];

const EXTRA_DIRECTION_SUGGESTIONS = [
    'Keep the existing path layout.',
    'Use fewer plant species and simpler groupings.',
    'Make it look easier and cheaper to recreate.',
    'Avoid luxury features and oversized specimen plants.',
    'Keep the planting low-maintenance and readable.',
    'Use a calmer color palette with less visual noise.',
];

const DEFAULT_DESIGN_BRIEF = {
    spaceType: 'outdoor_home',
    style: 'flowering_cottage',
    mood: 'natural',
    maintenanceLevel: 'medium',
    hardscape: 'mixed',
    density: 'balanced',
    realismLevel: 'easy_to_recreate',
    budgetLevel: 'budget_friendly',
    extraDirections: '',
};

const PLANNER_SELECTED_PLANT_LIMIT = 10;

function createEmptyPlantInput(localId) {
    return {
        localId,
        dbId: '',
        query: '',
        selectedPlant: null,
    };
}

function createPlantInputFromPremiumSeed(plant, localId) {
    return {
        localId,
        dbId: plant?.id ? String(plant.id) : '',
        query: getPlantTitle(plant),
        selectedPlant: plant || null,
    };
}

function getPlantTitle(plant) {
    if (!plant) return 'Choose a plant';
    const latinName = Array.isArray(plant.scientific_name) ? plant.scientific_name[0] : plant.scientific_name;
    return plant.common_name || latinName || `Plant #${plant.id}`;
}

function getPlantSubtitle(plant) {
    if (!plant) return 'Search by name, species, or Latin name';
    const latinName = Array.isArray(plant.scientific_name) ? plant.scientific_name[0] : plant.scientific_name;
    const type = plant?.details?.type || plant?.type;

    if (latinName && plant.common_name && latinName !== plant.common_name) {
        return latinName;
    }

    return type || 'Plant';
}

function getPlantImage(plant) {
    return (
        plant?.default_image?.regular_url ||
        plant?.default_image?.medium_url ||
        plant?.default_image?.small_url ||
        plant?.default_image?.thumbnail ||
        null
    );
}

function getOptionLabel(options, value) {
    return options.find((option) => option.value === value)?.label || value;
}

function appendDirectionSuggestion(currentValue, suggestion) {
    const current = String(currentValue || '').trim();
    if (!current) return suggestion;
    if (current.toLowerCase().includes(suggestion.toLowerCase())) return current;
    return `${current} ${suggestion}`.trim();
}

function fileToDataUrl(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = () => reject(new Error('Failed to read the selected file.'));
        reader.readAsDataURL(file);
    });
}

function loadImageElement(dataUrl) {
    return new Promise((resolve, reject) => {
        const image = new Image();
        image.onload = () => resolve(image);
        image.onerror = () => reject(new Error('The uploaded image could not be processed.'));
        image.src = dataUrl;
    });
}

async function prepareReferencePhoto(file) {
    const initialDataUrl = await fileToDataUrl(file);
    const image = await loadImageElement(initialDataUrl);
    const maxSide = 1600;
    const scale = Math.min(1, maxSide / Math.max(image.width, image.height));
    const width = Math.max(1, Math.round(image.width * scale));
    const height = Math.max(1, Math.round(image.height * scale));
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;

    const context = canvas.getContext('2d');
    if (!context) {
        throw new Error('Your browser could not prepare the uploaded photo.');
    }

    context.drawImage(image, 0, 0, width, height);

    const mimeType = 'image/jpeg';
    const previewUrl = canvas.toDataURL(mimeType, 0.86);
    const base64 = previewUrl.split(',')[1];

    return {
        name: file.name,
        mimeType,
        data: base64,
        previewUrl,
        width,
        height,
    };
}

export default function GardenDrawer() {
    const { user } = useAuth();
    const navigate = useNavigate();

    const [plantInputs, setPlantInputs] = useSessionStorageState('page:garden-drawer:plant-inputs', [createEmptyPlantInput(1)]);
    const [designBrief, setDesignBrief] = useSessionStorageState('page:garden-drawer:design-brief', DEFAULT_DESIGN_BRIEF);
    const [referenceMode, setReferenceMode] = useSessionStorageState('page:garden-drawer:reference-mode', 'from_scratch');
    const [referenceGardenPhoto, setReferenceGardenPhoto] = useState(null);
    const [photoPreparing, setPhotoPreparing] = useState(false);
    const [gardenImage, setGardenImage] = useState(null);
    const [generatedImages, setGeneratedImages] = useState([]);
    const [activeVariationIndex, setActiveVariationIndex] = useSessionStorageState('page:garden-drawer:active-variation-index', 0);
    const [generatedFromReferencePhoto, setGeneratedFromReferencePhoto] = useState(false);
    const [comparePosition, setComparePosition] = useState(50);
    const [plantGuide, setPlantGuide] = useState([]);
    const [showPlantGuide, setShowPlantGuide] = useSessionStorageState('page:garden-drawer:show-plant-guide', false);
    const [, setPlantGuideLoading] = useState(false);
    const [, setPlantGuideError] = useState(null);
    const [activeGuidePlantId, setActiveGuidePlantId] = useSessionStorageState('page:garden-drawer:active-guide-plant-id', null);
    const [loading, setLoading] = useState(false);
    const [savingGarden, setSavingGarden] = useState(false);
    const [saveMessage, setSaveMessage] = useState({ text: '', type: '' });
    const [error, setError] = useState(null);
    const [showExtraSettings, setShowExtraSettings] = useSessionStorageState('page:garden-drawer:show-extra-settings', false);
    const [activeSearchId, setActiveSearchId] = useSessionStorageState('page:garden-drawer:active-search-id', null);
    const [searchResults, setSearchResults] = useState([]);
    const [searching, setSearching] = useState(false);
    const [favouritePlants, setFavouritePlants] = useState([]);
    const [favouritesLoading, setFavouritesLoading] = useState(false);
    const [previewFrameSize, setPreviewFrameSize] = useState({ width: 0, height: 0 });
    const [previewImageSize, setPreviewImageSize] = useState({ width: 0, height: 0 });
    const previewFrameRef = useRef(null);
    const premiumSeedAppliedRef = useRef(false);

    usePageScrollRestoration('page:garden-drawer', !loading && !photoPreparing && !searching);

    useEffect(() => {
        if (!user) {
            navigate('/login');
        }
    }, [user, navigate]);

    useEffect(() => {
        if (premiumSeedAppliedRef.current) return;
        premiumSeedAppliedRef.current = true;

        const plannerSeed = consumePendingPremiumPlannerSeed();
        if (!plannerSeed) return;

        const nextSelectedPlants = Array.isArray(plannerSeed.selectedPlants)
            ? plannerSeed.selectedPlants.filter(Boolean)
            : [];
        const nextPlantInputs = nextSelectedPlants.length > 0
            ? nextSelectedPlants.map((plant, index) => createPlantInputFromPremiumSeed(plant, index + 1))
            : [createEmptyPlantInput(1)];
        const nextGeneratedImages = Array.isArray(plannerSeed.generatedImages)
            ? plannerSeed.generatedImages.filter(Boolean)
            : [];
        const nextGardenImage = plannerSeed.gardenImage || nextGeneratedImages[0] || null;

        setPlantInputs(nextPlantInputs);
        setDesignBrief(() => ({
            ...DEFAULT_DESIGN_BRIEF,
            ...(plannerSeed.designBrief || {}),
        }));
        setReferenceMode(plannerSeed.referenceMode === 'photo_edit' ? 'photo_edit' : 'from_scratch');
        setReferenceGardenPhoto(plannerSeed.referenceGardenPhoto || null);
        setGeneratedImages(nextGeneratedImages);
        setActiveVariationIndex(Number.isFinite(plannerSeed.activeVariationIndex) ? plannerSeed.activeVariationIndex : 0);
        setGardenImage(nextGardenImage);
        setGeneratedFromReferencePhoto(Boolean(plannerSeed.generatedFromReferencePhoto));
        setComparePosition(50);
        setShowPlantGuide(false);
        setPlantGuide([]);
        setPlantGuideLoading(false);
        setPlantGuideError(null);
        setActiveGuidePlantId(null);
        setSaveMessage({ text: '', type: '' });
        setError(null);
    }, [
        setActiveGuidePlantId,
        setActiveVariationIndex,
        setComparePosition,
        setDesignBrief,
        setError,
        setGardenImage,
        setGeneratedFromReferencePhoto,
        setGeneratedImages,
        setPlantGuide,
        setPlantGuideError,
        setPlantGuideLoading,
        setPlantInputs,
        setReferenceGardenPhoto,
        setReferenceMode,
        setSaveMessage,
        setShowPlantGuide,
    ]);

    useEffect(() => {
        if (!user) return;

        const token = localStorage.getItem('token');
        if (!token) return;

        const loadFavouritePlants = async () => {
            try {
                setFavouritesLoading(true);
                const response = await fetch(buildUrl('/favourites'), {
                    headers: {
                        Authorization: `Bearer ${token}`,
                    },
                });

                if (!response.ok) {
                    throw new Error('Failed to load favourites.');
                }

                const data = await response.json();
                setFavouritePlants(data.plants || []);
            } catch (err) {
                console.error('Failed to load favourite plants:', err);
                setFavouritePlants([]);
            } finally {
                setFavouritesLoading(false);
            }
        };

        loadFavouritePlants();
    }, [user]);

    const activeInput = useMemo(
        () => plantInputs.find((plant) => plant.localId === activeSearchId) || null,
        [plantInputs, activeSearchId]
    );

    const selectedCount = useMemo(
        () => plantInputs.filter((plant) => Number(plant.dbId) > 0).length,
        [plantInputs]
    );

    const selectedPlants = useMemo(
        () => plantInputs.map((plant) => plant.selectedPlant).filter(Boolean),
        [plantInputs]
    );

    const validSelectedPlantIds = useMemo(
        () =>
            plantInputs
                .map((plant) => Number(plant.dbId))
                .filter((id) => !Number.isNaN(id) && id > 0),
        [plantInputs]
    );

    const usesReferencePhoto = referenceMode === 'photo_edit' && Boolean(referenceGardenPhoto);
    const maxSelectablePlants = PLANNER_SELECTED_PLANT_LIMIT;
    const showBeforeAfterSlider = Boolean(
        gardenImage && generatedFromReferencePhoto && referenceGardenPhoto?.previewUrl
    );
    const previewImage = gardenImage || referenceGardenPhoto?.previewUrl || null;

    const previewHeading = showBeforeAfterSlider
        ? 'Compare your garden before and after'
        : gardenImage
        ? 'Your generated garden image'
        : usesReferencePhoto
            ? 'Your uploaded garden photo'
            : 'Your generated garden image appears here';

    const previewCopy = showBeforeAfterSlider
        ? 'Drag the slider to compare your original garden photo with the Gemini-edited version.'
        : gardenImage
        ? usesReferencePhoto
            ? 'Gemini edited your uploaded garden photo with the plants you selected.'
            : 'This version was generated from your selected plants.'
        : usesReferencePhoto
            ? 'This is the garden photo that will be used as the base scene for plant placement.'
            : 'Choose the plants you want to see, then generate a garden concept from those species only.';

    const guideMarkers = useMemo(
        () =>
            plantGuide.map((marker, index) => ({
                ...marker,
                order: index + 1,
            })),
        [plantGuide]
    );

    const previewImageRect = useMemo(() => {
        if (
            !previewFrameSize.width ||
            !previewFrameSize.height ||
            !previewImageSize.width ||
            !previewImageSize.height
        ) {
            return null;
        }

        const containerRatio = previewFrameSize.width / previewFrameSize.height;
        const imageRatio = previewImageSize.width / previewImageSize.height;

        let width = previewFrameSize.width;
        let height = previewFrameSize.height;
        let left = 0;
        let top = 0;

        if (imageRatio > containerRatio) {
            height = width / imageRatio;
            top = (previewFrameSize.height - height) / 2;
        } else {
            width = height * imageRatio;
            left = (previewFrameSize.width - width) / 2;
        }

        return { width, height, left, top };
    }, [previewFrameSize, previewImageSize]);

    useEffect(() => {
        if (!activeInput) {
            setSearchResults([]);
            setSearching(false);
            return;
        }

        const query = activeInput.query.trim();
        if (query.length < 2) {
            setSearchResults([]);
            setSearching(false);
            return;
        }

        let cancelled = false;
        const timeoutId = window.setTimeout(async () => {
            try {
                setSearching(true);
                const url = new URL(buildUrl('/plants'));
                url.searchParams.set('page', '1');
                url.searchParams.set('limit', '6');
                url.searchParams.set('search', query);

                const response = await fetch(url.toString());
                if (!response.ok) {
                    throw new Error('Failed to search plants.');
                }

                const data = await response.json();
                if (!cancelled) {
                    setSearchResults(data.data || []);
                }
            } catch (err) {
                console.error('Plant search failed:', err);
                if (!cancelled) {
                    setSearchResults([]);
                }
            } finally {
                if (!cancelled) {
                    setSearching(false);
                }
            }
        }, 250);

        return () => {
            cancelled = true;
            clearTimeout(timeoutId);
        };
    }, [activeInput]);

    useEffect(() => {
        if (!previewFrameRef.current) return undefined;

        const updatePreviewFrameSize = () => {
            if (!previewFrameRef.current) return;
            const { clientWidth, clientHeight } = previewFrameRef.current;
            setPreviewFrameSize({ width: clientWidth, height: clientHeight });
        };

        updatePreviewFrameSize();

        if (typeof ResizeObserver === 'function') {
            const observer = new ResizeObserver(() => updatePreviewFrameSize());
            observer.observe(previewFrameRef.current);
            return () => observer.disconnect();
        }

        window.addEventListener('resize', updatePreviewFrameSize);
        return () => window.removeEventListener('resize', updatePreviewFrameSize);
    }, [previewImage]);

    const resetPlantGuide = () => {
        setPlantGuide([]);
        setShowPlantGuide(false);
        setPlantGuideLoading(false);
        setPlantGuideError(null);
        setActiveGuidePlantId(null);
    };

    const clearGeneratedPreview = () => {
        setGardenImage(null);
        setGeneratedImages([]);
        setActiveVariationIndex(0);
        setGeneratedFromReferencePhoto(false);
        setComparePosition(50);
        setSaveMessage({ text: '', type: '' });
        resetPlantGuide();
    };

    const handlePreviewImageLoad = (event) => {
        setPreviewImageSize({
            width: event.currentTarget.naturalWidth || 0,
            height: event.currentTarget.naturalHeight || 0,
        });
    };

    const addPlantInput = () => {
        if (plantInputs.length >= maxSelectablePlants) {
            setError(`You can add up to ${PLANNER_SELECTED_PLANT_LIMIT} plants in this planner.`);
            return;
        }

        const newId = Math.max(...plantInputs.map((plant) => plant.localId || 0), 0) + 1;
        setPlantInputs([...plantInputs, createEmptyPlantInput(newId)]);
        clearGeneratedPreview();
        setError(null);
    };

    const updatePlantQuery = (localId, value) => {
        setPlantInputs(
            plantInputs.map((plant) =>
                plant.localId === localId
                    ? { ...plant, query: value, dbId: '', selectedPlant: null }
                    : plant
            )
        );
        setActiveSearchId(localId);
        clearGeneratedPreview();
        setError(null);
    };

    const selectPlant = (localId, plant) => {
        const currentInput = plantInputs.find((inputPlant) => inputPlant.localId === localId);
        const selectingIntoEmptySlot = !currentInput?.dbId;

        if (selectingIntoEmptySlot && selectedCount >= maxSelectablePlants) {
            setError(`You can select up to ${PLANNER_SELECTED_PLANT_LIMIT} plants in this planner.`);
            return;
        }

        setPlantInputs(
            plantInputs.map((inputPlant) =>
                inputPlant.localId === localId
                    ? {
                          ...inputPlant,
                          dbId: String(plant.id),
                          query: getPlantTitle(plant),
                          selectedPlant: plant,
                      }
                    : inputPlant
            )
        );
        setActiveSearchId(null);
        setSearchResults([]);
        clearGeneratedPreview();
        setError(null);
    };

    const clearPlantSelection = (localId) => {
        if (plantInputs.length === 1) {
            setPlantInputs([createEmptyPlantInput(1)]);
        } else {
            setPlantInputs(plantInputs.filter((plant) => plant.localId !== localId));
        }

        if (activeSearchId === localId) {
            setActiveSearchId(null);
            setSearchResults([]);
        }

        clearGeneratedPreview();
        setError(null);
    };

    const addFavouritePlant = (plant) => {
        const alreadySelected = plantInputs.some((inputPlant) => Number(inputPlant.dbId) === plant.id);
        if (alreadySelected) {
            return;
        }

        if (selectedCount >= maxSelectablePlants) {
            setError(`You can select up to ${PLANNER_SELECTED_PLANT_LIMIT} plants in this planner.`);
            return;
        }

        const emptySlot = plantInputs.find((inputPlant) => !inputPlant.dbId);
        if (emptySlot) {
            selectPlant(emptySlot.localId, plant);
            return;
        }

        const newId = Math.max(...plantInputs.map((inputPlant) => inputPlant.localId || 0), 0) + 1;
        setPlantInputs([
            ...plantInputs,
            {
                localId: newId,
                dbId: String(plant.id),
                query: getPlantTitle(plant),
                selectedPlant: plant,
            },
        ]);
        clearGeneratedPreview();
        setError(null);
    };

    const updateDesignBrief = (field, value) => {
        setDesignBrief((previous) => ({
            ...previous,
            [field]: value,
        }));
        clearGeneratedPreview();
        setError(null);
    };

    const handleReferenceModeChange = (mode) => {
        setReferenceMode(mode);
        clearGeneratedPreview();
        setError(null);
    };

    const handleReferencePhotoChange = async (event) => {
        const file = event.target.files?.[0];
        if (!file) return;

        if (!file.type.startsWith('image/')) {
            setError('Please upload a valid image file.');
            return;
        }

        try {
            setPhotoPreparing(true);
            setError(null);
            const preparedPhoto = await prepareReferencePhoto(file);
            setReferenceGardenPhoto(preparedPhoto);
            setReferenceMode('photo_edit');
            clearGeneratedPreview();
        } catch (err) {
            console.error('Garden photo preparation failed:', err);
            setError(err.message || 'The uploaded garden photo could not be prepared.');
        } finally {
            setPhotoPreparing(false);
            event.target.value = '';
        }
    };

    const clearReferencePhoto = () => {
        setReferenceGardenPhoto(null);
        setReferenceMode('from_scratch');
        clearGeneratedPreview();
        setError(null);
    };

    const generateGardenImage = async (variationCount = 1) => {
        try {
            setLoading(true);
            setError(null);
            setPlantGuideError(null);
            setSaveMessage({ text: '', type: '' });

            const token = localStorage.getItem('token');
            const validIds = validSelectedPlantIds;

            if (validIds.length === 0) {
                setError('Select at least one plant from the list.');
                return;
            }

            if (referenceMode === 'photo_edit' && !referenceGardenPhoto) {
                setError('Upload a garden photo first, or switch back to Generate from Scratch.');
                return;
            }

            if (validIds.length > maxSelectablePlants) {
                setError(`Planner generation supports up to ${PLANNER_SELECTED_PLANT_LIMIT} selected plants.`);
                return;
            }

            if (!token) {
                setError('Your session has expired. Please sign in again.');
                navigate('/login');
                return;
            }

            const response = await fetch(buildUrl('/api/generate-photorealistic-garden'), {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({
                    selectedPlantIds: validIds,
                    gardenStyle: designBrief.style,
                    designPreferences: designBrief,
                    variationCount,
                    referenceGardenPhoto: usesReferencePhoto
                        ? {
                              mimeType: referenceGardenPhoto.mimeType,
                              data: referenceGardenPhoto.data,
                              name: referenceGardenPhoto.name,
                          }
                        : null,
                }),
            });

            const contentType = response.headers.get('content-type') || '';

            if (!response.ok) {
                let errorMessage = 'A server error occurred.';

                if (contentType.includes('application/json')) {
                    const errorData = await response.json();
                    errorMessage = errorData.error || errorData.message || errorMessage;
                } else {
                    const errorText = (await response.text()).trim();
                    if (errorText) {
                        errorMessage = errorText;
                    }
                }

                if (response.status === 401 || response.status === 403) {
                    errorMessage = 'Your session has expired or is invalid. Please sign in again.';
                }

                setError(errorMessage);
                return;
            }

            if (!contentType.includes('application/json')) {
                throw new Error('The server did not return a JSON response.');
            }

            const data = await response.json();
            resetPlantGuide();
            const images = Array.isArray(data.images) && data.images.length > 0
                ? data.images
                : (data.imageBase64 ? [data.imageBase64] : []);

            setGeneratedImages(images);
            setActiveVariationIndex(0);
            setGardenImage(images[0] || null);
            setGeneratedFromReferencePhoto(usesReferencePhoto);
            setComparePosition(50);
        } catch (err) {
            console.error('Generation error:', err);
            setError(`Error: ${err.message}`);
        } finally {
            setLoading(false);
        }
    };

    const selectGeneratedVariation = (index) => {
        const nextImage = generatedImages[index];
        if (!nextImage) return;

        resetPlantGuide();
        setActiveVariationIndex(index);
        setGardenImage(nextImage);
        setComparePosition(50);
        setError(null);
    };

    const downloadImage = () => {
        if (!gardenImage) return;

        const element = document.createElement('a');
        element.href = gardenImage;
        element.download = `dream_garden_${new Date().getTime()}.jpg`;
        document.body.appendChild(element);
        element.click();
        document.body.removeChild(element);
    };

    const saveCurrentGarden = async () => {
        if (!gardenImage) return;

        try {
            setSavingGarden(true);
            setSaveMessage({ text: '', type: '' });

            const token = localStorage.getItem('token');
            if (!token) {
                setSaveMessage({ text: 'Your session has expired. Please sign in again.', type: 'error' });
                navigate('/login');
                return;
            }

            const styleLabel = getOptionLabel(STYLE_OPTIONS, designBrief.style);
            const payload = {
                title: `${styleLabel} Garden`,
                image: gardenImage,
                referenceImage: generatedFromReferencePhoto ? referenceGardenPhoto?.previewUrl || '' : '',
                usedReferencePhoto: generatedFromReferencePhoto,
                gardenStyle: designBrief.style,
                variationIndex: activeVariationIndex,
                selectedPlants: selectedPlants.map((plant) => ({
                    plantId: Number(plant.id),
                    commonName: plant.common_name || '',
                    scientificName: Array.isArray(plant.scientific_name)
                        ? plant.scientific_name[0] || ''
                        : plant.scientific_name || '',
                    image: getPlantImage(plant) || '',
                })),
            };

            const response = await fetch(buildUrl('/saved-gardens'), {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify(payload),
            });

            const data = await response.json().catch(() => ({}));
            if (!response.ok) {
                throw new Error(data.message || 'Failed to save this garden.');
            }

            setSaveMessage({ text: 'Garden saved to your profile.', type: 'success' });
        } catch (err) {
            console.error('Save garden error:', err);
            setSaveMessage({ text: err.message || 'Failed to save this garden.', type: 'error' });
        } finally {
            setSavingGarden(false);
        }
    };

    if (!user) {
        return null;
    }

    return (
        <div className="font-dm text-greenDark overflow-x-hidden bg-greenLight">
            <Navbar />
            <div className="space-y-0">
                <section className="relative px-4 pb-10 pt-28">
                    <div className="max-w-6xl mx-auto space-y-8">
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.6 }}
                            className="mx-auto max-w-3xl px-2 text-center"
                        >
                            <h1 className="font-playfair text-5xl leading-tight text-greenDark">
                                AI Garden <span className="text-landingPageIcons">Planner</span>
                            </h1>
                        </motion.div>

                        <motion.div
                            initial={{ opacity: 0, y: 24 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.6, delay: 0.1 }}
                            className="relative min-h-[420px] overflow-hidden rounded-[36px] border border-white/80 bg-[#eef4e6] shadow-[0_24px_80px_rgba(52,78,24,0.16)]"
                            ref={previewFrameRef}
                        >
                            {showBeforeAfterSlider ? (
                                <div className="relative h-full min-h-[420px] bg-[#eef4e6]">
                                    <img
                                        src={referenceGardenPhoto.previewUrl}
                                        alt="Original garden photo"
                                        className="w-full h-full min-h-[420px] bg-[#eef4e6] object-contain"
                                    />
                                    <div
                                        className="absolute inset-0 overflow-hidden"
                                        style={{ clipPath: `inset(0 ${100 - comparePosition}% 0 0)` }}
                                    >
                                        <img
                                            src={gardenImage}
                                            alt="Gemini edited garden"
                                            onLoad={handlePreviewImageLoad}
                                            className="w-full h-full min-h-[420px] bg-[#eef4e6] object-contain"
                                        />
                                    </div>

                                    <div className="pointer-events-none absolute inset-y-0 z-10" style={{ left: `calc(${comparePosition}% - 1px)` }}>
                                        <div className="relative h-full w-[2px] bg-white shadow-[0_0_18px_rgba(0,0,0,0.28)]">
                                            <div className="absolute left-1/2 top-1/2 flex h-12 w-12 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border-2 border-white bg-landingPageIcons text-white shadow-[0_12px_30px_rgba(52,78,24,0.28)]">
                                                <ArrowRight size={18} className="rotate-180" />
                                                <ArrowRight size={18} className="-ml-1" />
                                            </div>
                                        </div>
                                    </div>

                                    <div className="absolute left-5 top-5 z-10 rounded-full bg-white/88 px-4 py-2 text-xs font-bold uppercase tracking-[0.18em] text-greenDark shadow-sm">
                                        Before
                                    </div>
                                    <div className="absolute right-5 top-5 z-10 rounded-full bg-white/88 px-4 py-2 text-xs font-bold uppercase tracking-[0.18em] text-greenDark shadow-sm">
                                        After
                                    </div>

                                    <div className="absolute inset-x-0 bottom-0 z-10 bg-gradient-to-t from-[rgba(26,46,10,0.22)] to-transparent px-6 pb-6 pt-20">
                                        <div className="mx-auto max-w-xl rounded-[22px] border border-white/60 bg-white/86 px-4 py-4 backdrop-blur-sm shadow-[0_18px_50px_rgba(52,78,24,0.16)]">
                                            <div className="mb-2 flex items-center justify-between text-[11px] font-bold uppercase tracking-[0.18em] text-greenMid">
                                                <span>Before</span>
                                                <span>After</span>
                                            </div>
                                            <input
                                                type="range"
                                                min="0"
                                                max="100"
                                                step="1"
                                                value={comparePosition}
                                                onChange={(event) => setComparePosition(Number(event.target.value))}
                                                className="w-full accent-landingPageIcons"
                                                aria-label="Compare original and generated garden image"
                                            />
                                        </div>
                                    </div>
                                </div>
                            ) : previewImage ? (
                                <img
                                    src={previewImage}
                                    alt={gardenImage ? 'AI Generated Garden' : 'Uploaded garden reference'}
                                    onLoad={handlePreviewImageLoad}
                                    className="w-full h-full min-h-[420px] bg-[#eef4e6] object-contain"
                                />
                            ) : (
                                <div className="h-full min-h-[420px] bg-[linear-gradient(135deg,rgba(222,228,209,0.92),rgba(164,191,121,0.72))] flex items-center justify-center p-8">
                                    <div className="max-w-md text-center">
                                        <div className="inline-flex items-center gap-2 bg-white/80 text-landingPageIcons rounded-full px-4 py-2 text-xs font-bold uppercase tracking-[0.22em] mb-5">
                                            <Sparkles size={14} />
                                            Preview Zone
                                        </div>
                                        <h2 className="font-playfair text-4xl text-greenDark mb-4 leading-tight">
                                            {previewHeading}
                                        </h2>
                                        <p className="text-greenMid text-base leading-relaxed">
                                            {previewCopy}
                                        </p>
                                    </div>
                                </div>
                            )}

                            {showPlantGuide && previewImageRect && guideMarkers.length > 0 && (
                                <div className="pointer-events-none absolute inset-0">
                                    {guideMarkers.map((marker) => {
                                        const isActive = activeGuidePlantId === marker.plantId;
                                        const left = previewImageRect.left + (marker.x / 100) * previewImageRect.width;
                                        const top = previewImageRect.top + (marker.y / 100) * previewImageRect.height;

                                        return (
                                            <button
                                                key={`${marker.plantId}-${marker.order}`}
                                                type="button"
                                                onClick={() => setActiveGuidePlantId(marker.plantId)}
                                                className="pointer-events-auto absolute -translate-x-1/2 -translate-y-full"
                                                style={{ left, top }}
                                            >
                                                <div className="flex flex-col items-center gap-1">
                                                    {isActive && (
                                                        <div className="rounded-full bg-white/92 px-3 py-1 text-xs font-semibold text-greenDark shadow-md">
                                                            {marker.label}
                                                        </div>
                                                    )}
                                                    <ArrowDown
                                                        size={20}
                                                        className={isActive ? 'text-landingPageIcons' : 'text-white drop-shadow-[0_2px_6px_rgba(0,0,0,0.35)]'}
                                                    />
                                                    <span
                                                        className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold shadow-md ${
                                                            isActive
                                                                ? 'bg-landingPageIcons text-white'
                                                                : 'bg-white text-greenDark'
                                                        }`}
                                                    >
                                                        {marker.order}
                                                    </span>
                                                </div>
                                            </button>
                                        );
                                    })}
                                </div>
                            )}

                        </motion.div>

                        <motion.div
                            initial={{ opacity: 0, y: 24 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.6, delay: 0.18 }}
                            className="rounded-[36px] border border-[#dce7cf] bg-white/82 p-8 lg:p-10"
                        >
                            <div className="inline-flex items-center gap-2 bg-garden text-landingPageIcons rounded-full px-4 py-1.5 text-xs font-bold uppercase tracking-[0.22em] mb-5">
                                <Sparkles size={13} />
                                Garden Generator
                            </div>
                            <h2 className="font-playfair text-4xl text-greenDark leading-tight mb-4">
                                Generate from plants or edit your own photo
                            </h2>
                            <p className="text-greenMid leading-relaxed mb-8">
                                Keep it simple: choose your plants, then either generate a fresh garden scene or upload your own garden photo and let Gemini place the plants into it.
                            </p>

                            <div className="mb-8 flex flex-wrap gap-3">
                                <div className="rounded-full border border-[#dce7cf] bg-[#f7faf2] px-5 py-3">
                                    <div className="text-[11px] font-bold uppercase tracking-[0.18em] text-greenMid mb-2">
                                        Selected
                                    </div>
                                    <div className="text-3xl font-playfair text-greenDark">{selectedCount}</div>
                                </div>
                                <div className="rounded-full border border-[#dce7cf] bg-[#f7faf2] px-5 py-3">
                                    <div className="text-[11px] font-bold uppercase tracking-[0.18em] text-greenMid mb-2">
                                        Favourites
                                    </div>
                                    <div className="text-3xl font-playfair text-greenDark">
                                        {favouritePlants.length}
                                    </div>
                                </div>
                            </div>

                            <div className="rounded-[26px] border border-[#dce7cf] bg-[#f7faf2] p-5 mb-6 space-y-5">
                                <div>
                                    <div className="text-[11px] font-bold uppercase tracking-[0.18em] text-greenMid mb-3">
                                        Generation Mode
                                    </div>
                                    <div className="grid gap-3 sm:grid-cols-2">
                                        <button
                                            type="button"
                                            onClick={() => handleReferenceModeChange('from_scratch')}
                                            className={`rounded-2xl border px-4 py-3 text-left transition ${
                                                referenceMode === 'from_scratch'
                                                    ? 'border-landingPageIcons bg-white text-greenDark shadow-sm'
                                                    : 'border-[#dce7cf] bg-[#fbfcf8] text-greenMid hover:bg-white'
                                            }`}
                                        >
                                            <div className="font-semibold">Generate from Scratch</div>
                                            <div className="mt-1 text-sm">Create a brand-new garden image from the selected plants.</div>
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => handleReferenceModeChange('photo_edit')}
                                            className={`rounded-2xl border px-4 py-3 text-left transition ${
                                                referenceMode === 'photo_edit'
                                                    ? 'border-landingPageIcons bg-white text-greenDark shadow-sm'
                                                    : 'border-[#dce7cf] bg-[#fbfcf8] text-greenMid hover:bg-white'
                                            }`}
                                        >
                                            <div className="font-semibold">Edit My Garden Photo</div>
                                            <div className="mt-1 text-sm">Upload a real garden photo and place the selected plants into it.</div>
                                        </button>
                                    </div>
                                </div>

                                <div>
                                    <div className="text-[11px] font-bold uppercase tracking-[0.18em] text-greenMid mb-3">
                                        Garden Type
                                    </div>
                                    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                                        {STYLE_OPTIONS.map((styleOption) => (
                                            <button
                                                key={styleOption.value}
                                                type="button"
                                                onClick={() => updateDesignBrief('style', styleOption.value)}
                                                className={`rounded-2xl border px-4 py-3 text-left transition ${
                                                    designBrief.style === styleOption.value
                                                        ? 'border-landingPageIcons bg-white text-greenDark shadow-sm'
                                                        : 'border-[#dce7cf] bg-[#fbfcf8] text-greenMid hover:bg-white'
                                                }`}
                                            >
                                                <div className="font-semibold">{styleOption.label}</div>
                                                <div className="mt-1 text-sm">{styleOption.summary}</div>
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                <div className="rounded-[22px] border border-dashed border-[#dce7cf] bg-white px-4 py-4">
                                    <div className="flex flex-wrap items-center gap-3 justify-between">
                                        <div>
                                            <div className="text-[11px] font-bold uppercase tracking-[0.18em] text-greenMid mb-2">
                                                Garden Photo
                                            </div>
                                            <p className="text-sm text-greenMid">
                                                {referenceGardenPhoto
                                                    ? `${referenceGardenPhoto.name} is ready to use.`
                                                    : 'Optional. Upload your own garden photo if you want Gemini to edit that exact space.'}
                                            </p>
                                        </div>
                                        <label className="inline-flex cursor-pointer items-center gap-2 rounded-2xl bg-landingPageIcons px-4 py-3 text-sm font-semibold text-white transition hover:bg-darkLandingPageIcons">
                                            <Upload size={16} />
                                            {photoPreparing ? 'Preparing Photo...' : 'Upload Photo'}
                                            <input
                                                type="file"
                                                accept="image/*"
                                                className="hidden"
                                                onChange={handleReferencePhotoChange}
                                                disabled={photoPreparing}
                                            />
                                        </label>
                                    </div>

                                    {referenceGardenPhoto && (
                                        <div className="mt-4 flex flex-wrap items-center gap-3">
                                            <button
                                                type="button"
                                                onClick={() => handleReferenceModeChange('photo_edit')}
                                                className="rounded-full border border-[#dce7cf] bg-[#f7faf2] px-4 py-2 text-xs font-semibold text-landingPageIcons"
                                            >
                                                Use Uploaded Photo
                                            </button>
                                            <button
                                                type="button"
                                                onClick={clearReferencePhoto}
                                                className="rounded-full border border-[#f0d2d2] bg-white px-4 py-2 text-xs font-semibold text-[#b34b4b]"
                                            >
                                                Remove Photo
                                            </button>
                                        </div>
                                    )}
                                </div>

                                {selectedPlants.length > 0 && (
                                    <div className="flex flex-wrap gap-2">
                                        <span className="rounded-full border border-[#dce7cf] bg-white px-4 py-2 text-xs font-semibold text-landingPageIcons">
                                            {getOptionLabel(STYLE_OPTIONS, designBrief.style)}
                                        </span>
                                        {selectedPlants.map((plant) => (
                                            <span key={plant.id} className="rounded-full border border-[#dce7cf] bg-white px-4 py-2 text-xs font-semibold text-landingPageIcons">
                                                {getPlantTitle(plant)}
                                            </span>
                                        ))}
                                    </div>
                                )}
                            </div>

                            <div className="mb-6 overflow-hidden rounded-[26px] border border-[#dce7cf] bg-white">
                                <button
                                    type="button"
                                    onClick={() => setShowExtraSettings((previous) => !previous)}
                                    className="flex w-full items-center justify-between px-5 py-4 text-left transition hover:bg-[#fbfcf8]"
                                >
                                    <span className="text-[11px] font-bold uppercase tracking-[0.18em] text-greenMid">
                                        Extra Settings
                                    </span>
                                    <ArrowDown
                                        size={18}
                                        className={`text-greenMid transition-transform duration-300 ${
                                            showExtraSettings ? 'rotate-180' : ''
                                        }`}
                                    />
                                </button>

                                {showExtraSettings && (
                                    <div className="border-t border-[#eef3e7] p-5">
                                        <div className="flex flex-wrap items-start justify-between gap-4 mb-4">
                                            <div>
                                                <div className="text-[11px] font-bold uppercase tracking-[0.18em] text-greenMid mb-2">
                                                    Extra Directions
                                                </div>
                                                <p className="text-sm text-greenMid max-w-2xl">
                                                    Do not write a full AI prompt. Add one or two short notes about realism, budget, or what the design should keep or avoid.
                                                </p>
                                            </div>
                                            <div className="rounded-full border border-[#dce7cf] bg-[#f7faf2] px-3 py-1.5 text-[11px] font-semibold text-landingPageIcons">
                                                {designBrief.extraDirections.length}/220
                                            </div>
                                        </div>

                                        <div className="grid gap-4 lg:grid-cols-2">
                                            <div>
                                                <textarea
                                                    value={designBrief.extraDirections}
                                                    onChange={(event) =>
                                                        updateDesignBrief(
                                                            'extraDirections',
                                                            event.target.value.slice(0, 220)
                                                        )
                                                    }
                                                    placeholder="Example: Keep the existing path, make it cheaper to recreate, and avoid overly dense planting."
                                                    className="min-h-[140px] w-full rounded-[22px] border border-[#dce7cf] bg-[#fbfcf8] px-4 py-3 text-sm text-greenDark outline-none transition focus:border-landingPageIcons focus:ring-2 focus:ring-greenChip"
                                                />
                                                <div className="mt-3 rounded-[18px] border border-dashed border-[#dce7cf] bg-[#f7faf2] px-4 py-3 text-sm text-greenMid">
                                                    Good notes are short and practical: mood, budget, maintenance, what to keep, and what to avoid.
                                                </div>
                                            </div>

                                            <div className="space-y-4">
                                                <div>
                                                    <div className="text-[11px] font-bold uppercase tracking-[0.18em] text-greenMid mb-3">
                                                        Quick Suggestions
                                                    </div>
                                                    <div className="flex flex-wrap gap-2">
                                                        {EXTRA_DIRECTION_SUGGESTIONS.map((suggestion) => (
                                                            <button
                                                                key={suggestion}
                                                                type="button"
                                                                onClick={() =>
                                                                    updateDesignBrief(
                                                                        'extraDirections',
                                                                        appendDirectionSuggestion(
                                                                            designBrief.extraDirections,
                                                                            suggestion
                                                                        ).slice(0, 220)
                                                                    )
                                                                }
                                                                className="rounded-full border border-[#dce7cf] bg-[#f7faf2] px-3 py-2 text-xs font-semibold text-landingPageIcons transition hover:border-landingPageIcons hover:bg-white"
                                                            >
                                                                {suggestion}
                                                            </button>
                                                        ))}
                                                    </div>
                                                </div>

                                                <div className="grid gap-4 sm:grid-cols-2">
                                                    <div>
                                                        <div className="text-[11px] font-bold uppercase tracking-[0.18em] text-greenMid mb-3">
                                                            Build Realism
                                                        </div>
                                                        <div className="space-y-2">
                                                            {REALISM_OPTIONS.map((option) => (
                                                                <button
                                                                    key={option.value}
                                                                    type="button"
                                                                    onClick={() => updateDesignBrief('realismLevel', option.value)}
                                                                    className={`w-full rounded-2xl border px-4 py-3 text-left transition ${
                                                                        designBrief.realismLevel === option.value
                                                                            ? 'border-landingPageIcons bg-[#f7faf2] text-greenDark shadow-sm'
                                                                            : 'border-[#dce7cf] bg-white text-greenMid hover:bg-[#f7faf2]'
                                                                    }`}
                                                                >
                                                                    <div className="font-semibold">{option.label}</div>
                                                                    <div className="mt-1 text-xs">{option.summary}</div>
                                                                </button>
                                                            ))}
                                                        </div>
                                                    </div>

                                                    <div>
                                                        <div className="text-[11px] font-bold uppercase tracking-[0.18em] text-greenMid mb-3">
                                                            Budget Direction
                                                        </div>
                                                        <div className="space-y-2">
                                                            {BUDGET_OPTIONS.map((option) => (
                                                                <button
                                                                    key={option.value}
                                                                    type="button"
                                                                    onClick={() => updateDesignBrief('budgetLevel', option.value)}
                                                                    className={`w-full rounded-2xl border px-4 py-3 text-left transition ${
                                                                        designBrief.budgetLevel === option.value
                                                                            ? 'border-landingPageIcons bg-[#f7faf2] text-greenDark shadow-sm'
                                                                            : 'border-[#dce7cf] bg-white text-greenMid hover:bg-[#f7faf2]'
                                                                    }`}
                                                                >
                                                                    <div className="font-semibold">{option.label}</div>
                                                                    <div className="mt-1 text-xs">{option.summary}</div>
                                                                </button>
                                                            ))}
                                                        </div>
                                                    </div>
                                                </div>

                                                <div className="grid gap-3 sm:grid-cols-2">
                                                    <div className="rounded-[18px] border border-[#dce7cf] bg-[#f7faf2] px-4 py-3">
                                                        <div className="text-[11px] font-bold uppercase tracking-[0.16em] text-greenMid mb-2">
                                                            Good Example
                                                        </div>
                                                        <p className="text-sm text-greenDark">
                                                            Keep the existing path, use fewer plant species, and make it look easier to recreate on a normal budget.
                                                        </p>
                                                    </div>
                                                    <div className="rounded-[18px] border border-[#f0d2d2] bg-[#fff7f5] px-4 py-3">
                                                        <div className="text-[11px] font-bold uppercase tracking-[0.16em] text-[#b75a45] mb-2">
                                                            Avoid
                                                        </div>
                                                        <p className="text-sm text-[#91533f]">
                                                            Luxury resort garden, masterpiece, cinematic, 8K, ultra-detailed, exotic plants everywhere.
                                                        </p>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>

                            <div className="grid gap-3 md:grid-cols-2">
                                <motion.button
                                    onClick={() => generateGardenImage(1)}
                                    disabled={loading}
                                    whileHover={loading ? undefined : { scale: 1.01 }}
                                    whileTap={loading ? undefined : { scale: 0.99 }}
                                    className={`w-full py-4 px-6 rounded-2xl text-white font-bold text-lg shadow-lg transition ${loading ? 'bg-gray-400 cursor-not-allowed' : 'bg-gradient-to-r from-landingPageIcons to-darkLandingPageIcons hover:scale-[1.01] hover:shadow-xl'}`}
                                >
                                    <span className="inline-flex items-center justify-center gap-2">
                                        <Sparkles size={18} />
                                        {loading
                                            ? 'Generating Garden...'
                                            : usesReferencePhoto
                                                ? 'Edit My Garden Photo'
                                                : 'Generate Garden'}
                                        {!loading && <ArrowRight size={18} />}
                                    </span>
                                </motion.button>

                                <motion.button
                                    onClick={() => generateGardenImage(3)}
                                    disabled={loading}
                                    whileHover={loading ? undefined : { scale: 1.01 }}
                                    whileTap={loading ? undefined : { scale: 0.99 }}
                                    className={`w-full py-4 px-6 rounded-2xl border text-lg font-bold transition ${loading ? 'border-[#dce7cf] bg-white text-greenMid cursor-not-allowed' : 'border-[#dce7cf] bg-white text-greenDark hover:bg-[#f7faf2] shadow-sm hover:shadow-md'}`}
                                >
                                    <span className="inline-flex items-center justify-center gap-2">
                                        <Sparkles size={18} />
                                        {loading ? 'Generating Variations...' : 'Generate 3 Variations'}
                                    </span>
                                </motion.button>
                            </div>

                            {generatedImages.length > 1 && (
                                <div className="mt-5 rounded-[22px] border border-[#dce7cf] bg-[#f7faf2] p-4">
                                    <div className="mb-3 text-[11px] font-bold uppercase tracking-[0.18em] text-greenMid">
                                        Variations
                                    </div>
                                    <div className="grid gap-3 sm:grid-cols-3">
                                        {generatedImages.map((image, index) => (
                                            <button
                                                key={`${index}-${image.slice(0, 32)}`}
                                                type="button"
                                                onClick={() => selectGeneratedVariation(index)}
                                                className={`overflow-hidden rounded-[20px] border text-left transition ${
                                                    activeVariationIndex === index
                                                        ? 'border-landingPageIcons bg-white shadow-md'
                                                        : 'border-[#dce7cf] bg-white hover:border-[#c9d8b8]'
                                                }`}
                                            >
                                                <div className="relative h-28 bg-[#eef4e6]">
                                                    <img
                                                        src={image}
                                                        alt={`Garden variation ${index + 1}`}
                                                        className="h-full w-full object-cover"
                                                    />
                                                    <div className="absolute left-3 top-3 rounded-full bg-white/88 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.14em] text-greenDark">
                                                        V{index + 1}
                                                    </div>
                                                </div>
                                                <div className="px-4 py-3 text-sm font-semibold text-greenDark">
                                                    Variation {index + 1}
                                                </div>
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {gardenImage && (
                                <div className="mt-3 grid gap-3 md:grid-cols-2">
                                    <button
                                        onClick={downloadImage}
                                        className="w-full py-3 px-5 rounded-2xl border border-[#dce7cf] bg-white text-greenDark font-semibold hover:bg-greenLight transition inline-flex items-center justify-center gap-2"
                                    >
                                        <Download size={18} />
                                        Download Image
                                    </button>
                                    <button
                                        onClick={saveCurrentGarden}
                                        disabled={savingGarden}
                                        className={`w-full py-3 px-5 rounded-2xl border font-semibold transition inline-flex items-center justify-center gap-2 ${
                                            savingGarden
                                                ? 'border-[#dce7cf] bg-white text-greenMid cursor-not-allowed'
                                                : 'border-[#dce7cf] bg-[#f7faf2] text-greenDark hover:bg-white'
                                        }`}
                                    >
                                        <Save size={18} />
                                        {savingGarden ? 'Saving Garden...' : 'Save Garden'}
                                    </button>
                                </div>
                            )}

                            {saveMessage.text && (
                                <div
                                    className={`mt-4 rounded-[20px] border px-4 py-3 text-sm font-medium ${
                                        saveMessage.type === 'success'
                                            ? 'border-[#c7e4ba] bg-[#f1faea] text-[#2e6b1f]'
                                            : 'border-[#f4c9c5] bg-[#fff2f0] text-[#b64035]'
                                    }`}
                                >
                                    {saveMessage.text}
                                </div>
                            )}

                            {error && (
                                <div className="mt-6 rounded-[24px] border border-red-200 bg-red-50 p-4 text-red-800">
                                    <p className="font-semibold">Error</p>
                                    <p className="text-sm mt-1">{error}</p>
                                </div>
                            )}
                        </motion.div>
                    </div>
                </section>

                <section className="max-w-6xl mx-auto px-4 pb-20 pt-8 space-y-8">
                    <div className="rounded-[32px] border border-[#dce7cf] bg-white/88 p-6 md:p-8 shadow-[0_18px_60px_rgba(52,78,24,0.12)]">
                        <div className="flex items-center justify-between gap-4 mb-6">
                            <div>
                                <h2 className="font-playfair text-3xl text-greenDark">Selected Plants</h2>
                                <p className="text-greenMid mt-2">These become the hero planting palette in the generated garden concept.</p>
                            </div>
                            <button
                                onClick={addPlantInput}
                                disabled={plantInputs.length >= maxSelectablePlants}
                                className={`shrink-0 inline-flex items-center gap-2 rounded-2xl px-4 py-3 font-bold transition ${
                                    plantInputs.length >= maxSelectablePlants
                                        ? 'cursor-not-allowed bg-[#dce7cf] text-greenMid'
                                        : 'bg-landingPageIcons text-white hover:bg-darkLandingPageIcons'
                                }`}
                            >
                                <Plus size={18} />
                                Add Plant
                            </button>
                        </div>

                        <div className="mb-6 rounded-[22px] border border-dashed border-[#dce7cf] bg-[#f7faf2] px-4 py-4 text-sm text-greenMid">
                            Pick the species you want to see. You can generate a fresh garden from them, or upload your own garden photo and use these plants as the editing target.
                            <div className="mt-2 font-semibold text-landingPageIcons">
                                {`Planner workspace allows up to ${PLANNER_SELECTED_PLANT_LIMIT} selected plants.`}
                            </div>
                        </div>

                        <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
                            {plantInputs.map((plant) => {
                                const imageUrl = getPlantImage(plant.selectedPlant);

                                return (
                                    <article key={plant.localId} className="rounded-[26px] overflow-visible border border-[#dce7cf] bg-[#fbfcf8] shadow-[0_12px_40px_rgba(63,98,15,0.08)]">
                                        <div className="relative h-60 bg-[linear-gradient(135deg,#dfead4,#b8cb97)] overflow-hidden">
                                            {imageUrl ? (
                                                <img src={imageUrl} alt={getPlantTitle(plant.selectedPlant)} className="w-full h-full object-cover" />
                                            ) : (
                                                <div className="w-full h-full flex items-center justify-center">
                                                    <div className="text-center px-6">
                                                        <div className="text-[11px] font-bold uppercase tracking-[0.18em] text-greenDark/70 mb-3">Empty Slot</div>
                                                        <div className="font-playfair text-3xl text-greenDark">{plant.localId}.</div>
                                                    </div>
                                                </div>
                                            )}

                                            <div className="absolute left-4 bottom-4 inline-flex items-center gap-2 bg-white/88 backdrop-blur-sm rounded-full px-3 py-1.5 text-xs font-bold text-landingPageIcons">
                                                {plant.selectedPlant ? `#${plant.selectedPlant.id}` : `Slot #${plant.localId}`}
                                            </div>

                                            <button onClick={() => clearPlantSelection(plant.localId)} className="absolute top-4 right-4 w-10 h-10 rounded-full bg-white/88 text-red-500 flex items-center justify-center hover:bg-white transition shadow-md" title={plantInputs.length > 1 ? 'Remove plant' : 'Clear field'}>
                                                <X size={18} />
                                            </button>
                                        </div>

                                        <div className="p-5">
                                            <div className="mb-4">
                                                <h3 className="font-playfair text-2xl text-greenDark leading-tight">{getPlantTitle(plant.selectedPlant)}</h3>
                                                <p className="text-greenMid mt-1">{getPlantSubtitle(plant.selectedPlant)}</p>
                                            </div>

                                            <div className="relative">
                                                <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-greenMid pointer-events-none" />
                                                <input
                                                    type="text"
                                                    placeholder="Search for a plant..."
                                                    value={plant.query}
                                                    onFocus={() => setActiveSearchId(plant.localId)}
                                                    onBlur={() => {
                                                        window.setTimeout(() => setActiveSearchId(null), 150);
                                                    }}
                                                    onChange={(event) => updatePlantQuery(plant.localId, event.target.value)}
                                                    className="w-full pl-12 pr-4 py-3.5 border-2 border-[#dbe6cf] rounded-2xl bg-white text-greenDark focus:outline-none focus:border-landingPageIcons focus:ring-2 focus:ring-greenChip transition"
                                                />
                                                {activeSearchId === plant.localId && (
                                                    <div className="absolute left-0 right-0 top-[calc(100%+10px)] z-30 bg-white border border-[#dce7cf] rounded-[22px] shadow-[0_20px_50px_rgba(41,61,17,0.16)] overflow-hidden">
                                                        {plant.query.trim().length < 2 ? (
                                                            <div className="px-5 py-4 text-sm text-greenMid">Type at least 2 characters to search.</div>
                                                        ) : searching ? (
                                                            <div className="px-5 py-4 text-sm text-greenMid">Searching...</div>
                                                        ) : searchResults.length === 0 ? (
                                                            <div className="px-5 py-4 text-sm text-greenMid">No results found for this search.</div>
                                                        ) : (
                                                            <div className="max-h-80 overflow-y-auto">
                                                                {searchResults.map((result) => {
                                                                    const resultImage = getPlantImage(result);
                                                                    const resultAlreadySelected = plantInputs.some(
                                                                        (inputPlant) => Number(inputPlant.dbId) === Number(result.id)
                                                                    );
                                                                    const selectionDisabled =
                                                                        !resultAlreadySelected &&
                                                                        !plant.dbId &&
                                                                        selectedCount >= maxSelectablePlants;
                                                                    return (
                                                                        <button
                                                                            key={result.id}
                                                                            type="button"
                                                                            onMouseDown={(event) => event.preventDefault()}
                                                                            onClick={() => selectPlant(plant.localId, result)}
                                                                            disabled={selectionDisabled}
                                                                            className={`w-full flex items-center gap-4 px-4 py-4 border-b border-[#eef3e7] last:border-b-0 text-left transition ${
                                                                                selectionDisabled
                                                                                    ? 'cursor-not-allowed bg-[#f4f7ef] text-greenMid'
                                                                                    : 'hover:bg-[#f7faf2]'
                                                                            }`}
                                                                        >
                                                                            <div className="w-16 h-16 rounded-2xl overflow-hidden bg-greenLight shrink-0">
                                                                                {resultImage ? (
                                                                                    <img src={resultImage} alt={getPlantTitle(result)} className="w-full h-full object-cover" />
                                                                                ) : (
                                                                                    <div className="w-full h-full flex items-center justify-center text-greenDark font-bold">#{result.id}</div>
                                                                                )}
                                                                            </div>
                                                                            <div className="min-w-0">
                                                                                <div className="font-semibold text-greenDark truncate">{getPlantTitle(result)}</div>
                                                                                <div className="text-xs text-greenMid mt-1 truncate">
                                                                                    #{result.id}
                                                                                    {getPlantSubtitle(result) ? ` - ${getPlantSubtitle(result)}` : ''}
                                                                                </div>
                                                                            </div>
                                                                        </button>
                                                                    );
                                                                })}
                                                            </div>
                                                        )}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </article>
                                );
                            })}
                        </div>
                    </div>

                    <aside className="rounded-[32px] border border-[#dce7cf] bg-[#f7faf2] p-6 md:p-8 shadow-[0_18px_60px_rgba(52,78,24,0.1)]">
                        <div className="inline-flex items-center gap-2 bg-white text-landingPageIcons rounded-full px-4 py-1.5 text-xs font-bold uppercase tracking-[0.2em] mb-5 border border-[#dce7cf]">
                            <Star size={12} />
                            Favourites
                        </div>
                        <h2 className="font-playfair text-3xl text-greenDark mb-3">Quick Add</h2>
                        <p className="text-greenMid leading-relaxed mb-6">Add your favourite plants to the garden plan with a single click.</p>

                        {selectedPlants.length > 0 && (
                            <div className="rounded-[22px] border border-[#dce7cf] bg-white p-4 mb-6">
                                <div className="text-[11px] font-bold uppercase tracking-[0.18em] text-greenMid mb-3">Current Palette</div>
                                <div className="flex flex-wrap gap-2">
                                    {selectedPlants.map((plant) => (
                                        <span key={plant.id} className="rounded-full bg-garden px-3 py-1.5 text-xs font-semibold text-landingPageIcons">
                                            {getPlantTitle(plant)}
                                        </span>
                                    ))}
                                </div>
                            </div>
                        )}

                        {favouritesLoading ? (
                            <div className="text-sm text-greenMid">Loading favourites...</div>
                        ) : favouritePlants.length > 0 ? (
                            <div className="space-y-4">
                                {favouritePlants.map((plant) => {
                                    const imageUrl = getPlantImage(plant);
                                    const alreadySelected = plantInputs.some((inputPlant) => Number(inputPlant.dbId) === plant.id);

                                    return (
                                        <div key={plant.id} className="flex items-center gap-4 rounded-[22px] bg-white border border-[#dce7cf] p-3 shadow-sm">
                                            <div className="w-20 h-20 rounded-[20px] overflow-hidden bg-greenLight shrink-0">
                                                {imageUrl ? (
                                                    <img src={imageUrl} alt={getPlantTitle(plant)} className="w-full h-full object-cover" />
                                                ) : (
                                                    <div className="w-full h-full flex items-center justify-center text-greenDark font-bold">#{plant.id}</div>
                                                )}
                                            </div>

                                            <div className="min-w-0 flex-1">
                                                <div className="font-semibold text-greenDark truncate">{getPlantTitle(plant)}</div>
                                                <div className="text-xs text-greenMid mt-1 truncate">{getPlantSubtitle(plant)}</div>
                                                <div className="text-xs text-landingPageIcons mt-1 font-semibold">#{plant.id}</div>
                                            </div>

                                            <button
                                                onClick={() => addFavouritePlant(plant)}
                                                disabled={alreadySelected || selectedCount >= maxSelectablePlants}
                                                className={`shrink-0 rounded-2xl px-4 py-3 text-sm font-bold transition ${
                                                    alreadySelected || selectedCount >= maxSelectablePlants
                                                        ? 'bg-greenLight text-greenMid cursor-not-allowed'
                                                        : 'bg-landingPageIcons text-white hover:bg-darkLandingPageIcons'
                                                }`}
                                            >
                                                {alreadySelected ? 'Added' : selectedCount >= maxSelectablePlants ? 'Limit reached' : 'Add'}
                                            </button>
                                        </div>
                                    );
                                })}
                            </div>
                        ) : (
                            <div className="rounded-[22px] bg-white border border-dashed border-[#dce7cf] p-5 text-sm text-greenMid">
                                You do not have any favourite plants yet. Save a few in the Plant Library and they will appear here automatically.
                            </div>
                        )}
                    </aside>
                </section>
            </div>
        </div>
    );
}
