<template>
  <div>
    <b-container>
      <b-row no-gutters align-h="center" align-v="start">
        <b-col sm=12 md=5 align-self="center">
          <b-row no-gutters align-h="center" align-v="start">
            <b-col cols=12>
              <b-jumbotron fluid :header-level="$mq | mq({ xs: 5, sm: 5, md: 5, lg: 5, xl: 4 })">
                <template v-slot:header>GameShark</template>
              </b-jumbotron>
            </b-col>
          </b-row>
          <div v-if="this.conversionDirection === 'convertToRaw'" class="inputs-row">
            <input-file
              id="choose-gameshark-file"
              @load="readGameSharkSaveData($event)"
              :errorMessage="this.errorMessage"
              placeholderText="Choose a file to convert (*.sps)"
              acceptExtension=".sps"
              :leaveRoomForHelpIcon="false"
            />
          </div>
          <div v-else class="inputs-row">
            <output-filename v-model="outputFilename" :leaveRoomForHelpIcon="true"/>
            <output-filesize v-model="outputFilesize" id="gameshark-filesize" platform="gba"/>
          </div>
        </b-col>
        <b-col sm=12 md=2 lg=2 xl=2 align-self="start">
          <conversion-direction
            :horizontalLayout="['md', 'lg', 'xl']"
            :verticalLayout="['xs', 'sm']"
            :conversionDirection="this.conversionDirection"
            @change="changeConversionDirection($event)"
          />
        </b-col>
        <b-col sm=12 md=5 align-self="start">
          <b-row no-gutters align-h="center" align-v="start">
            <b-col cols=12>
              <b-jumbotron fluid :header-level="$mq | mq({ xs: 5, sm: 5, md: 5, lg: 5, xl: 4 })">
                <template v-slot:header>Emulator/Raw</template>
              </b-jumbotron>
            </b-col>
          </b-row>
          <div v-if="this.conversionDirection === 'convertToRaw'" class="inputs-row">
            <output-filename v-model="outputFilename" :leaveRoomForHelpIcon="true"/>
            <output-filesize v-model="outputFilesize" id="raw-filesize" platform="gba"/>
          </div>
          <div v-else class="inputs-row">
            <input-file
              id="choose-raw-file"
              @load="readEmulatorSaveData($event)"
              :errorMessage="this.errorMessage"
              placeholderText="Choose a file to convert"
              :leaveRoomForHelpIcon="true"
            />
            <input-file
              id="choose-raw-file-rom"
              @load="readRomData($event)"
              :errorMessage="null"
              placeholderText="Choose the ROM for this file (*.gba)"
              helpText="GameShark save files contain some information from the corresponding ROM, and some emulators check this information before allowing the save to be loaded.
              All processing by this website is done on your local machine, and your ROMs are not sent anywhere."
              acceptExtension=".gba"
              :leaveRoomForHelpIcon="true"
            />
          </div>
        </b-col>
      </b-row>
      <b-row class="justify-content-md-center" align-h="center">
        <b-col cols="auto" sm=4 md=3 lg=2 align-self="center">
          <b-button
            class="gameshark-convert-button"
            variant="success"
            block
            :disabled="!this.gameSharkSaveData || !outputFilename"
            @click="convertFile()"
          >
          Convert!
          </b-button>
        </b-col>
      </b-row>
      <b-row>
        <b-col>
          <div class="help">
            Help: how can I <router-link to="/original-hardware?sort=gba">copy save files to and from a GBA cartridge</router-link>?
          </div>
          <div class="help">
            Help: how do I <b-link href="https://gamehacking.org/vb/forum/video-game-hacking-and-development/school-of-hacking/14153-gameshark-advance-and-color-save-backup">copy save files to and from my GameShark</b-link>?
          </div>
        </b-col>
      </b-row>
    </b-container>
  </div>
</template>

<style scoped>

/* Separate class for each different button to enable tracking in google tag manager */
.gameshark-convert-button {
  margin-top: 1em;
}

.help {
  margin-top: 1em;
}

.inputs-row {
  min-height: 4.8em;
}

</style>

<script>
import dayjs from 'dayjs';
import { saveAs } from 'file-saver';
import Util from '../util/util';
import InputFile from './InputFile.vue';
import OutputFilename from './OutputFilename.vue';
import OutputFilesize from './OutputFilesize.vue';
import ConversionDirection from './ConversionDirection.vue';
import GameSharkSaveData from '../save-formats/GBA/GameShark';

export default {
  name: 'ConvertGbaGameShark',
  data() {
    return {
      gameSharkSaveData: null,
      romData: null,
      emulatorSaveData: null,
      emulatorSaveDataFilename: null,
      errorMessage: null,
      outputFilename: null,
      outputFilesize: null,
      conversionDirection: 'convertToRaw',
    };
  },
  components: {
    ConversionDirection,
    InputFile,
    OutputFilename,
    OutputFilesize,
  },
  methods: {
    changeConversionDirection(newDirection) {
      this.conversionDirection = newDirection;
      this.gameSharkSaveData = null;
      this.romData = null;
      this.emulatorSaveData = null;
      this.emulatorSaveDataFilename = null;
      this.errorMessage = null;
      this.outputFilename = null;
      this.outputFilesize = null;
    },
    readRomData(event) {
      this.romData = event.arrayBuffer;
      this.tryToCreateGameSharkSaveDataFromEmulatorSaveData();
    },
    readEmulatorSaveData(event) {
      this.emulatorSaveData = event.arrayBuffer;
      this.emulatorSaveDataFilename = event.filename;
      this.tryToCreateGameSharkSaveDataFromEmulatorSaveData();
    },
    readGameSharkSaveData(event) {
      this.errorMessage = null;
      try {
        this.gameSharkSaveData = GameSharkSaveData.createFromGameSharkData(event.arrayBuffer);
        this.outputFilename = Util.changeFilenameExtension(event.filename, 'srm');
        this.outputFilesize = this.gameSharkSaveData.getRawSaveData().byteLength;
      } catch (e) {
        this.errorMessage = e.message;
        this.gameSharkSaveData = null;
        this.outputFilename = null;
        this.outputFilesize = null;
      }
    },
    tryToCreateGameSharkSaveDataFromEmulatorSaveData() {
      if ((this.romData !== null) && (this.emulatorSaveData !== null) && (this.emulatorSaveDataFilename !== null)) { // Need to be careful that the user can choose the save data and ROM files in any order, so only proceed once both have been chosen
        this.errorMessage = null;

        try {
          const title = Util.removeFilenameExtension(this.emulatorSaveDataFilename);
          const date = dayjs().format('DD/MM/YYYY hh:mm:ss a');
          const notes = 'Created with savefileconverter.com';
          this.gameSharkSaveData = GameSharkSaveData.createFromEmulatorData(this.emulatorSaveData, title, date, notes, this.romData);
          this.outputFilename = Util.changeFilenameExtension(this.emulatorSaveDataFilename, 'sps');
          this.outputFilesize = this.gameSharkSaveData.getRawSaveData().byteLength;
        } catch (e) {
          this.errorMessage = e.message;
          this.gameSharkSaveData = null;
          this.outputFilename = null;
          this.outputFilesize = null;
        }
      }
    },
    convertFile() {
      if (this.gameSharkSaveData.getRawSaveData().byteLength !== this.outputFilesize) {
        this.gameSharkSaveData = GameSharkSaveData.createWithNewSize(this.gameSharkSaveData, this.outputFilesize);
      }

      const outputArrayBuffer = (this.conversionDirection === 'convertToRaw') ? this.gameSharkSaveData.getRawSaveData() : this.gameSharkSaveData.getArrayBuffer();

      const outputBlob = new Blob([outputArrayBuffer], { type: 'application/octet-stream' });

      saveAs(outputBlob, this.outputFilename); // Frustratingly, in Firefox the dialog says "from: blob:" and apparently this can't be changed: https://github.com/eligrey/FileSaver.js/issues/101
    },
  },
};

</script>
