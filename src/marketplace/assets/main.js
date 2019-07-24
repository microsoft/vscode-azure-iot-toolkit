let vscode;
try {
    vscode = acquireVsCodeApi();
} catch (error) {
    
}

const app = new Vue({
    el: '#app',
    data: {
        searchInput: '',
        selectedModule: {},
        selectedTag: "",
        moduleName: '',
        modules: [],
        endpoint: document.getElementById('app').getAttribute('data-endpoint'),
        errorMessageModuleName: "",
        errorMessageInitialization: "",
    },
    created: async function () {
        try {
            this.modules = await this.getModules();
        } catch (error) {
            this.errorMessageInitialization = error.toString();
        }
    },
    methods: {
        getModules: async function () {
            return (await axios.get(`${this.endpoint}/api/v1/modules`)).data;
        },
        getModuleMetadata: async function (module) {
            const data = (await axios.get(module.iotEdgeMetadataUrl)).data;
            let repository = data.containerUri;
            let defaultTag = data.tagsOrDigests.includes("latest") ? "latest" : data.tagsOrDigests[0];
            let splitArr = data.containerUri.split(":");
            if (splitArr.length > 1) {
                defaultTag = splitArr.pop();
                repository = splitArr.join(":");
                if (!data.tagsOrDigests.includes(defaultTag)) {
                    data.tagsOrDigests.push(defaultTag);
                }
            }

            data.repository = repository;
            data.defaultTag = defaultTag;

            return data;
        },
        showModule: async function (module) {
            this.errorMessageModuleName = "";
            const metadata = await this.getModuleMetadata(module);
            this.selectedModule = Object.assign({}, module);
            this.selectedModule.metadata = metadata;
            this.moduleName = this.selectedModule.displayName.replace(/[^a-zA-Z]/g, '');
            this.selectedTag = this.selectedModule.metadata.defaultTag;
        },
        importModule: async function () {
            this.errorMessageModuleName = "";
            if (!this.moduleName) {
                this.errorMessageModuleName = "Module name could not be empty";
                return;
            }
            const moduleNameValidationStatus = (await axios.get(`${this.endpoint}/api/v1/modules/${this.moduleName}/status`)).data;
            if (moduleNameValidationStatus) {
                this.errorMessageModuleName = moduleNameValidationStatus;
                return;
            }
            let environmentVariables = undefined;
            if (this.selectedModule.metadata.environmentVariables && this.selectedModule.metadata.environmentVariables.length > 0) {
                environmentVariables = {};
                for (const environmentVariable of this.selectedModule.metadata.environmentVariables) {
                    environmentVariables[environmentVariable.name] = {
                        value: environmentVariable.value
                    }
                }
            }
            let twins = undefined;
            if (this.selectedModule.metadata.twins && this.selectedModule.metadata.twins.length > 0) {
                const twinObject = {};
                for (const twin of this.selectedModule.metadata.twins) {
                    let twinValue = twin.value;
                    try {
                        twinValue = JSON.parse(twinValue);
                    } catch (error) {}
                    twinObject[twin.name] =  twinValue;
                }
                twins = {
                    "properties.desired": twinObject
                }
            }
            let createOptions = this.selectedModule.metadata.createOptions;
            try {
                createOptions = JSON.parse(createOptions);
            } catch (error) {}
            vscode.postMessage({
                id: this.selectedModule.id,
                moduleName: this.moduleName,
                imageName: this.selectedModule.metadata.repository + ":" + this.selectedTag,
                createOptions,
                routes: this.selectedModule.metadata.routes,
                twins,
                environmentVariables,
            });
        }
    },
    computed: {
        filteredModules: function () {
            return this.modules.filter(module => {
                return module.displayName.toLowerCase().includes(this.searchInput.toLowerCase());
            });
        }
    }
});
