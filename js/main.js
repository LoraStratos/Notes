Vue.component('columns', {
    template: `
        <div class="columns">
            <column class="colStyle" title="New" :cards="newColumn" @add-card="addCard('newColumn', $event)" @remove-card="removeCard('newColumn', $event)" @save-local-storage="saveToLocalStorage" @move-card-to-in-progress="moveCardToInProgress" @move-card-to-completed="moveCardToCompleted"></column>
            <column class="colStyle" title="In process" :cards="inProgressColumn" @remove-card="removeCard('inProgressColumn', $event)" @save-local-storage="saveToLocalStorage" @move-card-to-in-progress="moveCardToInProgress" @move-card-to-completed="moveCardToCompleted" @lock-first-column="lockFirstColumn"></column>
            <column class="colStyle" title="Done" :cards="completedColumn" @remove-card="removeCard('completedColumn', $event)" @save-local-storage="saveToLocalStorage"></column>
        </div>
        `,
    data() {
        return {
            newColumn: [],
            inProgressColumn: [],
            completedColumn: [],
            maxCards: {
                newColumn: 3,
                inProgressColumn: 5,
                completedColumn: Infinity
            },
            locked: false,
            isDesabled: false,
        }
    },
    created() {
        this.loadFromLocalStorage();
        this.checkLock();
    },
    methods: {
        addCard(column, customTitle) {
            if (this[column].length >= this.maxCards[column]) {
                alert(`Достигнуто максимальное количество карточек в столбце "${this.getColumnTitle(column)}".`);
                return;
            }
            if (this.inProgressColumn.length >= this.maxCards.inProgressColumn) {
                alert('Столбец "In process" уже содержит максимальное количество карточек.');
                return;
            }
            const newCard = {
                title: customTitle || 'New note',
                items: [
                    { text: '', completed: false, editing: true },
                    { text: '', completed: false, editing: true },
                    { text: '', completed: false, editing: true }
                ],
                status: 'New',
                locked: false,
            };
            this[column].push(newCard);
            this.saveToLocalStorage();
        },
        removeCard(column, cardIndex) {
            this[column].splice(cardIndex, 1);
            this.saveToLocalStorage();
            this.checkLock();
        },
        saveToLocalStorage() {
            localStorage.setItem('todo-columns', JSON.stringify({
                newColumn: this.newColumn,
                inProgressColumn: this.inProgressColumn,
                completedColumn: this.completedColumn
            }));
        },
        loadFromLocalStorage() {
            const data = JSON.parse(localStorage.getItem('todo-columns'));
            if (data) {
                this.newColumn = data.newColumn || [];
                this.inProgressColumn = data.inProgressColumn || [];
                this.completedColumn = data.completedColumn || [];
                this.newColumn.forEach(card => card.items.forEach(item => item.completed = !!item.completed));
                this.inProgressColumn.forEach(card => card.items.forEach(item => item.completed = !!item.completed));
                this.completedColumn.forEach(card => card.items.forEach(item => item.completed = !!item.completed));
            }
        },
        getColumnTitle(column) {
            switch (column) {
                case 'newColumn':
                    return 'New';
                case 'inProgressColumn':
                    return 'In process';
                case 'completedColumn':
                    return 'Done';
                default:
                    return '';
            }
        },
        moveCardToInProgress(card) {
            const index = this.newColumn.indexOf(card);
            if (index !== -1) {
                if (this.inProgressColumn.length >= this.maxCards.inProgressColumn) {
                    alert('Столбец "In process" уже содержит максимальное количество карточек.');
                    return;
                }

                this.newColumn.splice(index, 1);
                this.inProgressColumn.push(card);
                this.saveToLocalStorage();
                if (this.inProgressColumn.length >= this.maxCards.inProgressColumn) {
                    this.checkLock();
                }
            }
        },
        moveCardToCompleted(card) {
            const index = this.inProgressColumn.indexOf(card);
            if (index !== -1) {
                this.inProgressColumn.splice(index, 1);
                this.completedColumn.push(card);
                this.saveToLocalStorage();
            }
            this.checkLock();
        },
        checkLock() {
            if (this.inProgressColumn.length >= this.maxCards.inProgressColumn) {
                this.locked = true;
            } else {
                this.locked = false;
            }
            this.newColumn.forEach(card => card.locked = this.locked);
        }
        
    }
});

Vue.component('column', {
    props: ['title', 'cards', 'locked'],
    template: `
        <div class="column">
            <h2>{{ title }}</h2>
            <form action="" v-if="title === 'New'">
                <input type="text" v-model="customTitle">
                <button class="btn" v-if="title === 'New'" @click="addCardWithCustomTitle">Add note</button>
            </form>
            <card v-for="(card, index) in cards" :key="index" :card="card" @remove-card="removeCard(index)" @save-local-storage="saveToLocalStorage"  @move-card-to-in-progress="moveCardToInProgress" @move-card-to-completed="moveCardToCompleted"></card>
      </div>
    `,

    data() {
        return {
            customTitle: ''
        };
    },

    methods: {
        removeCard(cardIndex) {
            this.$emit('remove-card', cardIndex);
        },
        addCardWithCustomTitle() {
            if (this.customTitle) {
                this.$emit('add-card', this.customTitle);
            }
        },
        saveToLocalStorage() {
            this.$emit('save-local-storage');
        },
        moveCardToInProgress(card) {
            this.$emit('move-card-to-in-progress', card);
        },
        moveCardToCompleted(card) {
            this.$emit('move-card-to-completed', card);
        }
    }
});

Vue.component('card', {
    props: ['card', 'isFirstColumnLocked', 'inProgressColumn', 'isDesabled'],
    template: `
      <div class="card">
      <h3>{{ card.title }}</h3>
      <ul>
        <li v-for="(item, index) in card.items" :key="index">
          <input type="checkbox" v-model="item.completed" @change="saveToLocalStorage" :disabled="isDesabled || card.status === 'Done' || isFirstColumnLocked">
          <input type="text" v-model="item.text" @input="saveToLocalStorage" :disabled="isDesabled || !item.editing || card.status === 'Done' || (card.status === 'В процессе' && isFirstColumnLocked)">
        </li>
      </ul> 
      <button class="btn" v-if="card.status !== 'Done' && !isFirstColumnLocked" @click="removeCard">Delete note</button>
      <p v-if="card.status === 'Done'"><b>Date of the end: {{ card.completionDate }}</b></p>
      </div>
    `,
    methods: {
        removeCard() {
            if (!this.isFirstColumnLocked && this.card.status !== 'Done') {
                this.$emit('remove-card');
            }
        },
        saveToLocalStorage() {
            this.checkCardStatus();
            this.$emit('save-local-storage');
        },
        checkCardStatus() {
            const completedItems = this.card.items.filter(item => item.completed).length;
            const totalItems = this.card.items.length;
            const completionPercentage = (completedItems / totalItems) * 100;

            if (completionPercentage > 50 ) {
                this.card.status = 'In process';
                this.$emit('move-card-to-in-progress', this.card);
                if (completionPercentage >= 100) {
                    this.card.status = 'Done';
                    this.card.completionDate = new Date().toLocaleString();
                    this.$emit('move-card-to-completed', this.card);
                }
            }
            else if (completionPercentage > 50 && this.card.status === 'New' && this.locked) {
            } else if (completionPercentage > 50 && this.card.status === 'New') {
                this.$emit('move-card-to-in-progress', this.card);
            } else if (completionPercentage === 100 && this.card.status === 'In process') {
            } else {
                this.card.status = 'New';
            }
        }
    },
    computed: {
        maxBlock() {
            const completedItems = this.card.items.filter(item => item.completed).length;
            const totalItems = this.card.items.length;
            const completionPercentage = (completedItems / totalItems) * 100;
            if (this.inProgressColumn.length === 5 && completionPercentage < 50) {
                return !this.isDesabled;
            } else {
                return this.isDesabled;
            }
        }
    }   
});

new Vue({
    el: '#app',
    data() {
        return {
            newColumn: [],
            inProgressColumn: [],
            completedColumn: [],
            isFirstColumnLocked: false
        }
    },
    created() {
        this.loadFromLocalStorage();
    },
    methods: {
        removeCard(column, cardIndex) {
            this[column].splice(cardIndex, 1);
            this.saveToLocalStorage();
        },
        saveToLocalStorage() {
            localStorage.setItem('todo-columns', JSON.stringify({
                newColumn: this.newColumn,
                inProgressColumn: this.inProgressColumn,
                completedColumn: this.completedColumn
            }));
        },
        loadFromLocalStorage() {
            const data = JSON.parse(localStorage.getItem('todo-columns'));
            if (data) {
                this.newColumn = data.newColumn || [];
                this.inProgressColumn = data.inProgressColumn || [];
                this.completedColumn = data.completedColumn || [];
                this.newColumn.forEach(card => card.items.forEach(item => item.completed = !!item.completed));
                this.inProgressColumn.forEach(card => card.items.forEach(item => item.completed = !!item.completed));
                this.completedColumn.forEach(card => card.items.forEach(item => item.completed = !!item.completed));
            }
        },
    }
});
