import { AppletConfigInput, ConfigCulturalContext, ConfigDimension, ConfigMethod, ConfigResourceDef, ConfigThreshold, CreateAppletConfigInput, Dimension, Range } from '@neighbourhoods/client'

// ==========RANGES==========
const thumbsUpRange: Range = {
    "name": "thumbs-up-range",
    "kind": {
        "Float": { "min": -1, "max": 1 }
    }
}
const fiveStarRange: Range = {
    "name": "five-star-range",
    "kind": {
        "Float": { "min": 0, "max": 4 }
    }
}
const totalThumbsUpRange: Range = {
    "name": "total-thumbs-up-range",
    "kind": {
        "Float": { "min": -100000, "max": 1000000 }
    }
}

// ==========DIMENSIONS==========
const thumbsUpDimension: ConfigDimension = {
    "name": "thumbs_up",
    "range": thumbsUpRange,
    "computed": false
}

const fiveStarDimension: ConfigDimension = {
    "name": "five_star",
    "range": fiveStarRange,
    "computed": false
}
const totalThumbsUpDimension = {
    "name": "total_thumbs_up",
    "range": totalThumbsUpRange,
    "computed": true
}
const averageStarDimension = {
    "name": "average_heat",
    "range": fiveStarRange,
    "computed": true
}

// ==========RESOURCE DEFS==========
const genericResourceDef: ConfigResourceDef = {
    "name": "generic_resource",
    "base_types": [{ "entry_index": 0, "zome_index": 0, "visibility": { "Public": null } }],
    "dimensions": [],
}

// ==========METHODS==========
const totalThumbsUpMethod: ConfigMethod = {
    "name": "total_thumbs_up",
    "target_resource_def": genericResourceDef,
    "input_dimensions": [thumbsUpDimension],
    "output_dimension": totalThumbsUpDimension,
    "program": { "Sum": null },
    "can_compute_live": false,
    "requires_validation": false
}
const averageStarMethod: ConfigMethod = {
    "name": "average_heat_method",
    "target_resource_def": genericResourceDef,
    "input_dimensions": [fiveStarDimension],
    "output_dimension": averageStarDimension,
    "program": { "Average": null },
    "can_compute_live": false,
    "requires_validation": false
}

// ==========THRESHOLDS==========
const poorlyRatedThreshold: ConfigThreshold = {
    "dimension": totalThumbsUpDimension,
    "kind": { "LessThan": null },
    "value": { "Float": 0 }
}
const wellRatedThreshold: ConfigThreshold = {
    "dimension": totalThumbsUpDimension,
    "kind": { "GreaterThan": null },
    "value": { "Float": 0 }
}
const highStarThreshold: ConfigThreshold = {
    "dimension": averageStarDimension,
    "kind": { "GreaterThan": null },
    "value": { "Float": 2 }
}

// ==========CULTURAL CONTEXTS==========
const mostThumbsUpContext: ConfigCulturalContext = {
    "name": "most_thumbs_up",
    "resource_def": genericResourceDef,
    "thresholds": [wellRatedThreshold],
    "order_by": [[totalThumbsUpDimension, { "Biggest": null }]]
}
const leastThumbsUpContext: ConfigCulturalContext = {
    "name": "least_thumbs_up",
    "resource_def": genericResourceDef,
    "thresholds": [poorlyRatedThreshold],
    "order_by": [[totalThumbsUpDimension, { "Smallest": null }]]
}

const highStarContext: ConfigCulturalContext = {
    "name": "high_star",
    "resource_def": genericResourceDef,
    "thresholds": [highStarThreshold],
    "order_by": [[averageStarDimension, { "Biggest": null }]]
}

// ==========APPLET CONFIG==========
const appletConfigInput: AppletConfigInput = {
    "name": "default_applet_config",
    "ranges": [thumbsUpRange, fiveStarRange, totalThumbsUpRange],
    "dimensions": [thumbsUpDimension, fiveStarDimension, totalThumbsUpDimension, averageStarDimension],
    "resource_defs": [genericResourceDef],
    "methods": [totalThumbsUpMethod, averageStarMethod],
    "cultural_contexts": [mostThumbsUpContext, leastThumbsUpContext, highStarContext]
}

const defaultAppletConfig: CreateAppletConfigInput = {
    "applet_config_input": appletConfigInput,
    "role_name": "default_applet_config"
} 

export  { defaultAppletConfig }