export const ValidationProfiles = {
    'click': ['located', 'visible', 'enabled', 'stable'],
    'dblclick': ['located', 'visible', 'enabled', 'stable'],
    'drag start': ['located', 'visible', 'enabled', 'stable'],
    'drag': ['located', 'visible', 'enabled', 'stable'],
    'pointerdown': ['located', 'visible', 'enabled', 'stable'],
    'input': ['located', 'visible', 'enabled', 'stable'],
    'keyboard': ['located', 'visible', 'enabled', 'stable'],
    'hover': ['located', 'visible'],
    'default': ['located', 'visible']
};

export function getValidationProfile(interactionType) {
    return ValidationProfiles[interactionType] || ValidationProfiles['default'];
}
